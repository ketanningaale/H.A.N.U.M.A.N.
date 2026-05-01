import io
import logging
import tempfile
from typing import Optional
import numpy as np
import sounddevice as sd
import soundfile as sf
import yaml
from faster_whisper import WhisperModel

logger = logging.getLogger(__name__)

_model: Optional[WhisperModel] = None


def _cfg() -> dict:
    with open("config/settings.yaml") as f:
        return yaml.safe_load(f)["stt"]


def _get_model() -> WhisperModel:
    global _model
    if _model is None:
        cfg = _cfg()
        logger.info(f"Loading Whisper model '{cfg['model']}' on device '{cfg['device']}'...")
        _model = WhisperModel(cfg["model"], device=cfg["device"], compute_type="auto")
        logger.info("Whisper ready.")
    return _model


def record(duration_s: float = 5.0, sample_rate: int = 16000) -> np.ndarray:
    """Record audio from the default mic and return as a float32 numpy array."""
    logger.info(f"Recording for {duration_s}s...")
    audio = sd.rec(
        int(duration_s * sample_rate),
        samplerate=sample_rate,
        channels=1,
        dtype="float32",
    )
    sd.wait()
    return audio.flatten()


def record_until_silence(
    sample_rate: int = 16000,
    silence_threshold: float = 0.010,  # RMS below this = silence
    silence_duration_s: float = 1.2,
    max_duration_s: float = 30.0,
    chunk_s: float = 0.3,
) -> np.ndarray:
    """
    Record until the user stops speaking.
    Stops after silence_duration_s of quiet or max_duration_s total.
    """
    chunks = []
    silent_chunks = 0
    silence_limit = int(silence_duration_s / chunk_s)
    max_chunks = int(max_duration_s / chunk_s)
    chunk_size = int(sample_rate * chunk_s)

    logger.info("Listening...")
    with sd.InputStream(samplerate=sample_rate, channels=1, dtype="float32") as stream:
        for _ in range(max_chunks):
            chunk, _ = stream.read(chunk_size)
            chunk = chunk.flatten()
            chunks.append(chunk)
            rms = float(np.sqrt(np.mean(chunk ** 2)))
            if rms < silence_threshold:
                silent_chunks += 1
                if silent_chunks >= silence_limit:
                    break
            else:
                silent_chunks = 0

    return np.concatenate(chunks)


# Whisper's known hallucination phrases on silence — discard these
_HALLUCINATIONS = {
    "thanks for watching", "thank you for watching", "thank you.",
    "thanks for watching!", "you", ".", "", "subscribing", "bye",
}

def transcribe(audio: np.ndarray, sample_rate: int = 16000) -> str:
    """Transcribe a numpy audio array to text."""
    model = _get_model()

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        sf.write(tmp.name, audio, sample_rate)
        segments, _ = model.transcribe(
            tmp.name,
            language=_cfg().get("language", "en"),
            vad_filter=True,           # Silero VAD — strips non-speech before Whisper sees it
            vad_parameters={"min_silence_duration_ms": 500},
        )
        text = " ".join(seg.text.strip() for seg in segments).strip()

    logger.info(f"Transcribed: '{text}'")
    return text


def listen() -> str:
    """Record until silence, then transcribe. Returns spoken text or '' if silence/hallucination."""
    audio = record_until_silence()

    # Energy gate — skip transcription if audio is too quiet (ambient noise only)
    peak_rms = float(np.sqrt(np.mean(audio ** 2)))
    logger.debug(f"Audio RMS: {peak_rms:.4f}")
    if peak_rms < 0.005:
        logger.debug(f"Audio too quiet (RMS {peak_rms:.4f}), skipping transcription.")
        return ""

    text = transcribe(audio)

    # Discard known Whisper hallucinations
    if text.lower().strip().rstrip(".!?,") in _HALLUCINATIONS:
        logger.debug(f"Discarding hallucination: '{text}'")
        return ""

    return text
