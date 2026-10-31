"""Domain errors raised by the service layer.  Routes translate them to HTTP codes; nothing here knows about FastAPI."""


class ApiError(Exception):
    """Base class.  ``public_message`` is safe to show to a browser (no paths, no stack traces)."""
    http_status = 400

    def __init__(self, public_message, details=None):
        super().__init__(public_message)
        self.public_message = public_message
        self.details = details or []


class ValidationFailed(ApiError):
    http_status = 422


class NotFound(ApiError):
    http_status = 404


class Forbidden(ApiError):
    http_status = 403


class Conflict(ApiError):
    http_status = 409


class StaleVersion(Conflict):
    """The active schedule changed after the proposal's snapshot was taken."""


class QueueFull(ApiError):
    http_status = 429


class NotApprovable(ApiError):
    http_status = 422
