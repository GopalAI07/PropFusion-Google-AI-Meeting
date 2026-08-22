from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Any

from ..database.database import get_db
from ..database.models import User
from ..schemas.schemas import (
    RegisterRequest, LoginRequest, TokenResponse, TokenRefreshRequest,
    UserResponse, UserUpdateRequest, ChangePasswordRequest, APIResponse,
)
from ..services.auth_service import AuthService

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=APIResponse, status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user account and auto-login (returns JWT tokens)."""
    auth_service = AuthService(db)
    user = auth_service.register_user(
        username=request.username,
        email=request.email,
        password=request.password,
        full_name=request.full_name,
    )

    # Auto-login: issue tokens so the frontend can store credentials and
    # redirect to /dashboard immediately after registration.
    access_token = auth_service.create_access_token({"sub": user.id, "role": user.role.value})
    refresh_token = auth_service.create_refresh_token({"sub": user.id})

    return APIResponse(
        success=True,
        message="Registration successful.",
        data=TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=AuthService.user_to_response(user),
        ).model_dump(),
    )


@router.post("/login", response_model=APIResponse)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate user and return JWT tokens."""
    auth_service = AuthService(db)
    user, access_token, refresh_token = auth_service.authenticate_user(
        email=request.email,
        password=request.password,
    )

    return APIResponse(
        success=True,
        message="Login successful",
        data=TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=AuthService.user_to_response(user),
        ).model_dump(),
    )


@router.post("/refresh", response_model=APIResponse)
async def refresh_token(request: TokenRefreshRequest, db: Session = Depends(get_db)):
    """Refresh access token using refresh token."""
    auth_service = AuthService(db)
    access_token, refresh_token = auth_service.refresh_tokens(request.refresh_token)

    return APIResponse(
        success=True,
        message="Token refreshed successfully",
        data={
            "access_token": access_token,
            "refresh_token": refresh_token,
        },
    )


@router.get("/me", response_model=APIResponse)
async def get_current_user_profile(
    current_user: User = Depends(AuthService.get_current_user),
):
    """Get current authenticated user's profile."""
    return APIResponse(
        success=True,
        data={"user": AuthService.user_to_response(current_user).model_dump()},
    )


@router.put("/me", response_model=APIResponse)
async def update_profile(
    request: UserUpdateRequest,
    current_user: User = Depends(AuthService.get_current_user),
    db: Session = Depends(get_db),
):
    """Update current user's profile."""
    auth_service = AuthService(db)
    user = auth_service.update_user(
        current_user.id,
        request.model_dump(exclude_unset=True),
    )

    return APIResponse(
        success=True,
        message="Profile updated successfully",
        data={"user": AuthService.user_to_response(user).model_dump()},
    )


@router.post("/change-password", response_model=APIResponse)
async def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(AuthService.get_current_user),
    db: Session = Depends(get_db),
):
    """Change current user's password."""
    auth_service = AuthService(db)
    auth_service.change_password(
        current_user.id,
        request.current_password,
        request.new_password,
    )

    return APIResponse(
        success=True,
        message="Password changed successfully",
    )
