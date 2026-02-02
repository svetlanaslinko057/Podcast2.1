"""
Authentication & Authorization Middleware
Protects admin-only endpoints using wallet-based role verification
"""
from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, List
from functools import wraps
import jwt
import os
import logging

logger = logging.getLogger(__name__)

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET_KEY', 'fomo-podcasts-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"

security = HTTPBearer(auto_error=False)


class AuthUser:
    """Represents authenticated user"""
    def __init__(self, wallet_address: str, role: str, is_admin: bool, is_owner: bool):
        self.wallet_address = wallet_address
        self.role = role
        self.is_admin = is_admin
        self.is_owner = is_owner


def decode_token(token: str) -> Optional[dict]:
    """Decode JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("Token expired")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid token: {e}")
        return None


async def get_wallet_role(db, wallet_address: str) -> dict:
    """Get role for wallet address from database"""
    wallet = wallet_address.lower()
    
    settings = await db.club_settings.find_one({})
    if not settings:
        return {"role": "member", "is_admin": False, "is_owner": False}
    
    owner_wallet = settings.get("owner_wallet", "").lower()
    admin_wallets = [w.lower() for w in settings.get("admin_wallets", [])]
    
    is_owner = wallet == owner_wallet if owner_wallet else False
    is_admin = wallet in admin_wallets
    
    if is_owner:
        role = "owner"
    elif is_admin:
        role = "admin"
    else:
        role = "member"
    
    return {
        "role": role,
        "is_admin": is_admin or is_owner,
        "is_owner": is_owner
    }


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[AuthUser]:
    """
    Get current authenticated user from JWT token or wallet header.
    Returns None if not authenticated (for optional auth endpoints).
    """
    # Try JWT token first
    if credentials:
        token = credentials.credentials
        payload = decode_token(token)
        if payload:
            wallet = payload.get("wallet_address", "").lower()
            db = request.app.state.db if hasattr(request.app.state, 'db') else None
            
            if db and wallet:
                role_info = await get_wallet_role(db, wallet)
                return AuthUser(
                    wallet_address=wallet,
                    role=role_info["role"],
                    is_admin=role_info["is_admin"],
                    is_owner=role_info["is_owner"]
                )
    
    # Try X-Wallet-Address header (for frontend wallet connection)
    wallet_header = request.headers.get("X-Wallet-Address", "").lower()
    if wallet_header and wallet_header.startswith("0x"):
        db = request.app.state.db if hasattr(request.app.state, 'db') else None
        
        if db:
            role_info = await get_wallet_role(db, wallet_header)
            return AuthUser(
                wallet_address=wallet_header,
                role=role_info["role"],
                is_admin=role_info["is_admin"],
                is_owner=role_info["is_owner"]
            )
    
    return None


async def require_auth(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> AuthUser:
    """
    Require authenticated user. Raises 401 if not authenticated.
    """
    user = await get_current_user(request, credentials)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Please connect your wallet or provide a valid token."
        )
    return user


async def require_admin(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> AuthUser:
    """
    Require admin or owner role. Raises 401/403 if not authorized.
    """
    user = await get_current_user(request, credentials)
    
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Please connect your wallet."
        )
    
    if not user.is_admin:
        raise HTTPException(
            status_code=403,
            detail="Admin access required. Only admins and owners can perform this action."
        )
    
    return user


async def require_owner(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> AuthUser:
    """
    Require owner role. Raises 401/403 if not authorized.
    """
    user = await get_current_user(request, credentials)
    
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Please connect your wallet."
        )
    
    if not user.is_owner:
        raise HTTPException(
            status_code=403,
            detail="Owner access required. Only the club owner can perform this action."
        )
    
    return user


# Dependency shortcuts for route decorators
RequireAuth = Depends(require_auth)
RequireAdmin = Depends(require_admin)
RequireOwner = Depends(require_owner)
OptionalAuth = Depends(get_current_user)
