/**
 * Auth module DTO barrel file.
 * Only export DTOs that are actively used in the auth module.
 */

export { LoginDto } from "./login.dto";
export { RefreshTokenDto } from "./refresh-token.dto";
export { ForgotPasswordDto } from "./forgot-password.dto";
export { ResetPasswordDto } from "./reset-password.dto";

// Note: UpdateAuthDto and DeprecatedAuthPayloadDto removed — no longer used.