"""Authentication / authorization INTERFACE.

The project has no auth system yet, so this module defines the seam (``AuthProvider``) and one simple, secure-by-default
implementation (static bearer tokens from the environment).  Replace ``StaticTokenAuthProvider`` with a class that
validates your real session / JWT; nothing else in the API needs to change.

Secure by default: with no tokens configured, EVERY request is rejected.  Configure e.g.

    CIT_API_TOKENS="s3cret-token-1:alice:admin,s3cret-token-2:bob:admin|super_admin,tok3:carol:viewer"

Format: ``token:user_id:role1|role2`` separated by commas.  Roles: ``admin``, ``super_admin``; anything else is no access.
"""
import hmac
import logging
import os
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Dict, FrozenSet, Optional

_log = logging.getLogger(__name__)


@dataclass(frozen=True)
class Principal:
    user_id: str
    roles: FrozenSet[str] = frozenset()

    @property
    def is_super_admin(self):
        return "super_admin" in self.roles

    @property
    def is_admin(self):
        return "admin" in self.roles or self.is_super_admin


class AuthProvider(ABC):
    @abstractmethod
    def authenticate(self, token: Optional[str]) -> Optional[Principal]:
        """Return the Principal for a bearer token, or None if the token is missing/invalid."""


class StaticTokenAuthProvider(AuthProvider):
    def __init__(self, tokens: Dict[str, Principal]):
        self._tokens = dict(tokens)

    @classmethod
    def from_env(cls, var="CIT_API_TOKENS"):
        raw = os.environ.get(var, "").strip()
        tokens = {}
        for item in filter(None, (p.strip() for p in raw.split(","))):
            parts = item.split(":")
            if len(parts) != 3 or not all(parts):
                _log.warning("ignoring malformed entry in %s", var)
                continue
            token, user, roles = parts
            tokens[token] = Principal(user, frozenset(r.strip() for r in roles.split("|") if r.strip()))
        if not tokens:
            _log.warning("%s is empty: every API request will be rejected until tokens are configured", var)
        return cls(tokens)

    def authenticate(self, token):
        if not token:
            return None
        found = None
        for known, principal in self._tokens.items():      # constant-time compare, no early exit
            if hmac.compare_digest(known.encode(), token.encode()):
                found = principal
        return found


def can_access_job(principal: Optional[Principal], job_owner: str) -> bool:
    """Admins may see/approve their OWN jobs; super admins may see every job.  A UUID alone is never enough."""
    return bool(principal and principal.is_admin and (principal.is_super_admin or principal.user_id == job_owner))
