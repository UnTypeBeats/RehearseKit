"""
OAuth integration for Google authentication
"""
from typing import Optional, Dict, Any
import httpx
from google.oauth2 import id_token
from google.auth.transport import requests
from app.core.config import settings


class GoogleOAuth:
    """Google OAuth handler"""
    
    TOKEN_URL = "https://oauth2.googleapis.com/token"
    USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
    
    @staticmethod
    async def exchange_code_for_token(code: str) -> Optional[str]:
        """
        Exchange authorization code for access token
        
        Args:
            code: Authorization code from Google OAuth redirect
            
        Returns:
            Access token if successful, None otherwise
        """
        if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
            raise ValueError("Google OAuth credentials not configured")
        
        data = {
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code"
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(GoogleOAuth.TOKEN_URL, data=data)
                response.raise_for_status()
                token_data = response.json()
                return token_data.get("access_token")
        except Exception as e:
            print(f"Error exchanging code for token: {e}")
            return None
    
    @staticmethod
    async def verify_id_token(token: str) -> Optional[Dict[str, Any]]:
        """
        Verify Google ID token and extract user info
        
        Args:
            token: Google ID token
            
        Returns:
            User info dictionary if valid, None otherwise
        """
        if not settings.GOOGLE_CLIENT_ID:
            raise ValueError("Google Client ID not configured")
        
        try:
            # Verify the token
            idinfo = id_token.verify_oauth2_token(
                token,
                requests.Request(),
                settings.GOOGLE_CLIENT_ID
            )
            
            # Token is valid, return user info
            return {
                "oauth_id": idinfo.get("sub"),
                "email": idinfo.get("email"),
                "full_name": idinfo.get("name"),
                "avatar_url": idinfo.get("picture"),
                "email_verified": idinfo.get("email_verified", False)
            }
        except Exception as e:
            print(f"Error verifying ID token: {e}")
            return None
    
    @staticmethod
    async def get_user_info(access_token: str) -> Optional[Dict[str, Any]]:
        """
        Get user information from Google using access token
        
        Args:
            access_token: Google access token
            
        Returns:
            User info dictionary if successful, None otherwise
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    GoogleOAuth.USERINFO_URL,
                    headers={"Authorization": f"Bearer {access_token}"}
                )
                response.raise_for_status()
                user_data = response.json()
                
                return {
                    "oauth_id": user_data.get("id"),
                    "email": user_data.get("email"),
                    "full_name": user_data.get("name"),
                    "avatar_url": user_data.get("picture"),
                    "email_verified": user_data.get("verified_email", False)
                }
        except Exception as e:
            print(f"Error getting user info: {e}")
            return None


# Singleton instance
google_oauth = GoogleOAuth()

