import os
import httpx
from jose import jwt, JWTError
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from functools import lru_cache
import logging

logger = logging.getLogger(__name__)
security = HTTPBearer(auto_error=False)

def get_cognito_region():
    return os.getenv("AWS_REGION", "us-east-1")

def get_cognito_user_pool_id():
    return os.getenv("COGNITO_USER_POOL_ID", "")

def get_cognito_app_client_id():
    return os.getenv("COGNITO_APP_CLIENT_ID", "")

def is_dev_mode():
    return os.getenv("AUTH_DEV_MODE", "false").lower() == "true"


@lru_cache(maxsize=1)
def get_jwks():
    user_pool_id = get_cognito_user_pool_id()
    if not user_pool_id:
        return None
    region = get_cognito_region()
    url = f"https://cognito-idp.{region}.amazonaws.com/{user_pool_id}/.well-known/jwks.json"
    response = httpx.get(url, timeout=10)
    return response.json()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    if is_dev_mode():
        from app.dependencies import DEV_USER_ID, DEV_USER_EMAIL
        return {"id": DEV_USER_ID, "email": DEV_USER_EMAIL, "name": "Dev User"}

    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = credentials.credentials
    try:
        jwks = get_jwks()
        if not jwks:
            raise HTTPException(status_code=500, detail="Auth not configured")

        header = jwt.get_unverified_header(token)
        kid = header.get("kid")
        key = next((k for k in jwks.get("keys", []) if k["kid"] == kid), None)

        if not key:
            raise HTTPException(status_code=401, detail="Invalid token key")

        region = get_cognito_region()
        user_pool_id = get_cognito_user_pool_id()
        payload = jwt.decode(
            token, key, algorithms=["RS256"],
            audience=get_cognito_app_client_id(),
            issuer=f"https://cognito-idp.{region}.amazonaws.com/{user_pool_id}"
        )

        # Validate token_use - we expect ID token which contains user attributes
        token_use = payload.get("token_use")
        if token_use not in ("id", "access"):
            logger.warning(f"Invalid token_use: {token_use}")
            raise HTTPException(status_code=401, detail="Invalid token type")

        # Extract email - ID tokens have email in the payload, access tokens don't
        email = payload.get("email", "")

        # If no email in token (access token was sent), log warning
        if not email:
            logger.warning(f"Token missing email claim. token_use={token_use}, sub={payload.get('sub')}")
            # Try to get email from cognito:username if it looks like an email
            cognito_username = payload.get("cognito:username", "")
            if "@" in cognito_username:
                email = cognito_username

        return {
            "id": payload["sub"],
            "email": email,
            "name": payload.get("name", payload.get("cognito:username", "")),
        }
    except JWTError as e:
        logger.warning(f"JWT validation failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid or expired token")
