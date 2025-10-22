"""
Tests for security utilities and JWT token management
"""
import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, patch
from jose import jwt

from app.core.security import (
    create_access_token, create_refresh_token, decode_token, verify_token_type,
    blacklist_token, is_token_blacklisted, revoke_user_tokens, is_user_revoked,
    verify_password, get_password_hash
)
from app.core.config import settings


class TestJWTTokenCreation:
    """Test JWT token creation and validation"""
    
    def test_create_access_token(self):
        """Test creating access token with default expiration"""
        user_data = {"sub": "user123", "email": "test@example.com"}
        token = create_access_token(user_data)
        
        assert isinstance(token, str)
        assert len(token) > 0
        
        # Decode and verify token
        payload = decode_token(token)
        assert payload is not None
        assert payload["sub"] == "user123"
        assert payload["email"] == "test@example.com"
        assert payload["type"] == "access"
        assert "exp" in payload
        assert "iat" in payload
    
    def test_create_access_token_custom_expiration(self):
        """Test creating access token with custom expiration"""
        user_data = {"sub": "user123", "email": "test@example.com"}
        custom_expiry = timedelta(minutes=30)
        token = create_access_token(user_data, expires_delta=custom_expiry)
        
        payload = decode_token(token)
        assert payload is not None
        
        # Check expiration is approximately 30 minutes from now
        exp_time = datetime.fromtimestamp(payload["exp"])
        expected_time = datetime.utcnow() + custom_expiry
        time_diff = abs((exp_time - expected_time).total_seconds())
        assert time_diff < 60  # Allow 1 minute tolerance
    
    def test_create_refresh_token(self):
        """Test creating refresh token"""
        user_data = {"sub": "user123"}
        token = create_refresh_token(user_data)
        
        assert isinstance(token, str)
        assert len(token) > 0
        
        # Decode and verify token
        payload = decode_token(token)
        assert payload is not None
        assert payload["sub"] == "user123"
        assert payload["type"] == "refresh"
        assert "exp" in payload
        assert "iat" in payload
    
    def test_token_verification(self):
        """Test token type verification"""
        user_data = {"sub": "user123", "email": "test@example.com"}
        access_token = create_access_token(user_data)
        refresh_token = create_refresh_token(user_data)
        
        access_payload = decode_token(access_token)
        refresh_payload = decode_token(refresh_token)
        
        assert verify_token_type(access_payload, "access")
        assert verify_token_type(refresh_payload, "refresh")
        assert not verify_token_type(access_payload, "refresh")
        assert not verify_token_type(refresh_payload, "access")
    
    def test_invalid_token_decode(self):
        """Test decoding invalid token"""
        invalid_token = "invalid.jwt.token"
        payload = decode_token(invalid_token)
        assert payload is None
    
    def test_expired_token_decode(self):
        """Test decoding expired token"""
        # Create token with past expiration
        user_data = {"sub": "user123", "email": "test@example.com"}
        expired_time = datetime.utcnow() - timedelta(hours=1)
        
        payload = {
            "sub": "user123",
            "email": "test@example.com",
            "exp": int(expired_time.timestamp()),
            "iat": int((expired_time - timedelta(minutes=1)).timestamp()),
            "type": "access"
        }
        
        expired_token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
        decoded_payload = decode_token(expired_token)
        assert decoded_payload is None


class TestPasswordHashing:
    """Test password hashing and verification"""
    
    def test_password_hashing(self):
        """Test password hashing"""
        password = "test_password_123"
        hashed = get_password_hash(password)
        
        assert isinstance(hashed, str)
        assert len(hashed) > 0
        assert hashed != password  # Should be different from original
    
    def test_password_verification_success(self):
        """Test successful password verification"""
        password = "test_password_123"
        hashed = get_password_hash(password)
        
        assert verify_password(password, hashed)
    
    def test_password_verification_failure(self):
        """Test failed password verification"""
        password = "test_password_123"
        wrong_password = "wrong_password"
        hashed = get_password_hash(password)
        
        assert not verify_password(wrong_password, hashed)
    
    def test_password_verification_different_hashes(self):
        """Test that same password produces different hashes"""
        password = "test_password_123"
        hash1 = get_password_hash(password)
        hash2 = get_password_hash(password)
        
        # Different salts should produce different hashes
        assert hash1 != hash2
        
        # But both should verify correctly
        assert verify_password(password, hash1)
        assert verify_password(password, hash2)


class TestTokenBlacklisting:
    """Test JWT token blacklisting functionality"""
    
    @pytest.fixture
    def mock_redis(self):
        """Mock Redis client for testing"""
        mock_redis = Mock()
        mock_redis.setex.return_value = True
        mock_redis.exists.return_value = 0
        mock_redis.set.return_value = True
        mock_redis.get.return_value = None
        return mock_redis
    
    def test_blacklist_token_success(self, mock_redis):
        """Test successful token blacklisting"""
        token = "test_token_123"
        expires_in = 3600  # 1 hour
        
        with patch('app.core.security.get_redis_client', return_value=mock_redis):
            result = blacklist_token(token, expires_in)
        
        assert result is True
        mock_redis.setex.assert_called_once_with(f"blacklist:{token}", expires_in, "1")
    
    def test_blacklist_token_redis_failure(self, mock_redis):
        """Test token blacklisting when Redis fails"""
        mock_redis.setex.side_effect = Exception("Redis connection failed")
        token = "test_token_123"
        
        with patch('app.core.security.get_redis_client', return_value=mock_redis):
            result = blacklist_token(token)
        
        assert result is False
    
    def test_is_token_blacklisted_true(self, mock_redis):
        """Test checking blacklisted token"""
        mock_redis.exists.return_value = 1  # Token exists in blacklist
        token = "blacklisted_token"
        
        with patch('app.core.security.get_redis_client', return_value=mock_redis):
            result = is_token_blacklisted(token)
        
        assert result is True
        mock_redis.exists.assert_called_once_with(f"blacklist:{token}")
    
    def test_is_token_blacklisted_false(self, mock_redis):
        """Test checking non-blacklisted token"""
        mock_redis.exists.return_value = 0  # Token not in blacklist
        token = "valid_token"
        
        with patch('app.core.security.get_redis_client', return_value=mock_redis):
            result = is_token_blacklisted(token)
        
        assert result is False
    
    def test_is_token_blacklisted_redis_failure(self, mock_redis):
        """Test blacklist check when Redis fails"""
        mock_redis.exists.side_effect = Exception("Redis connection failed")
        token = "test_token"
        
        with patch('app.core.security.get_redis_client', return_value=mock_redis):
            result = is_token_blacklisted(token)
        
        # Should return False (not blacklisted) for availability
        assert result is False
    
    def test_revoke_user_tokens_success(self, mock_redis):
        """Test successful user token revocation"""
        user_id = "user123"
        
        with patch('app.core.security.get_redis_client', return_value=mock_redis):
            result = revoke_user_tokens(user_id)
        
        assert result is True
        mock_redis.set.assert_called_once()
        call_args = mock_redis.set.call_args
        assert call_args[0][0] == f"user_revoked:{user_id}"
        assert isinstance(call_args[0][1], int)  # Timestamp
    
    def test_revoke_user_tokens_redis_failure(self, mock_redis):
        """Test user token revocation when Redis fails"""
        mock_redis.set.side_effect = Exception("Redis connection failed")
        user_id = "user123"
        
        with patch('app.core.security.get_redis_client', return_value=mock_redis):
            result = revoke_user_tokens(user_id)
        
        assert result is False
    
    def test_is_user_revoked_true(self, mock_redis):
        """Test checking revoked user"""
        user_id = "user123"
        token_issued_at = 1000000000  # Old timestamp
        revoked_timestamp = 1000000001  # Later timestamp
        
        mock_redis.get.return_value = str(revoked_timestamp).encode()
        
        with patch('app.core.security.get_redis_client', return_value=mock_redis):
            result = is_user_revoked(user_id, token_issued_at)
        
        assert result is True
        mock_redis.get.assert_called_once_with(f"user_revoked:{user_id}")
    
    def test_is_user_revoked_false(self, mock_redis):
        """Test checking non-revoked user"""
        user_id = "user123"
        token_issued_at = 1000000001  # Recent timestamp
        revoked_timestamp = 1000000000  # Earlier timestamp
        
        mock_redis.get.return_value = str(revoked_timestamp).encode()
        
        with patch('app.core.security.get_redis_client', return_value=mock_redis):
            result = is_user_revoked(user_id, token_issued_at)
        
        assert result is False
    
    def test_is_user_revoked_no_revocation(self, mock_redis):
        """Test checking user with no revocation record"""
        user_id = "user123"
        token_issued_at = 1000000000
        
        mock_redis.get.return_value = None  # No revocation record
        
        with patch('app.core.security.get_redis_client', return_value=mock_redis):
            result = is_user_revoked(user_id, token_issued_at)
        
        assert result is False
    
    def test_is_user_revoked_redis_failure(self, mock_redis):
        """Test user revocation check when Redis fails"""
        mock_redis.get.side_effect = Exception("Redis connection failed")
        user_id = "user123"
        token_issued_at = 1000000000
        
        with patch('app.core.security.get_redis_client', return_value=mock_redis):
            result = is_user_revoked(user_id, token_issued_at)
        
        # Should return False (not revoked) for availability
        assert result is False


class TestTokenBlacklistingWithExpiration:
    """Test token blacklisting with automatic expiration"""
    
    def test_blacklist_token_with_automatic_expiration(self, mock_redis):
        """Test blacklisting token with automatic expiration from token"""
        # Create a valid token
        user_data = {"sub": "user123", "email": "test@example.com"}
        token = create_access_token(user_data)
        
        # Mock Redis
        mock_redis.setex.return_value = True
        
        with patch('app.core.security.get_redis_client', return_value=mock_redis):
            result = blacklist_token(token)  # No expiration provided
        
        assert result is True
        mock_redis.setex.assert_called_once()
        
        # Verify the expiration time is reasonable (should be close to token's natural expiration)
        call_args = mock_redis.setex.call_args
        expires_in = call_args[0][1]
        assert expires_in > 0
        assert expires_in <= settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60  # Should not exceed token expiration
    
    def test_blacklist_token_expired_token(self, mock_redis):
        """Test blacklisting an already expired token"""
        # Create an expired token
        expired_payload = {
            "sub": "user123",
            "email": "test@example.com",
            "exp": int((datetime.utcnow() - timedelta(hours=1)).timestamp()),
            "iat": int((datetime.utcnow() - timedelta(hours=2)).timestamp()),
            "type": "access"
        }
        
        expired_token = jwt.encode(expired_payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
        
        with patch('app.core.security.get_redis_client', return_value=mock_redis):
            result = blacklist_token(expired_token)
        
        # Should return False for expired tokens
        assert result is False
        mock_redis.setex.assert_not_called()
