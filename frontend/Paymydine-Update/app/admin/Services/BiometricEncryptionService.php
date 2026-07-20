<?php

namespace Admin\Services\BiometricDeviceService;

use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

/**
 * Biometric Encryption Service
 * Handles secure encryption and hashing of biometric data
 * Compliant with GDPR and data protection regulations
 */
class BiometricEncryptionService
{
    /**
     * Encrypt fingerprint template
     * @param string $template
     * @return string
     */
    public function encryptFingerprintTemplate(string $template): string
    {
        try {
            return Crypt::encryptString($template);
        } catch (\Exception $e) {
            Log::error('Failed to encrypt fingerprint template', ['error' => $e->getMessage()]);
            throw new \Exception('Encryption failed');
        }
    }

    /**
     * Decrypt fingerprint template
     * @param string $encryptedTemplate
     * @return string
     */
    public function decryptFingerprintTemplate(string $encryptedTemplate): string
    {
        try {
            return Crypt::decryptString($encryptedTemplate);
        } catch (\Exception $e) {
            Log::error('Failed to decrypt fingerprint template', ['error' => $e->getMessage()]);
            throw new \Exception('Decryption failed');
        }
    }

    /**
     * Encrypt face template
     * @param string $template
     * @return string
     */
    public function encryptFaceTemplate(string $template): string
    {
        try {
            return Crypt::encryptString($template);
        } catch (\Exception $e) {
            Log::error('Failed to encrypt face template', ['error' => $e->getMessage()]);
            throw new \Exception('Encryption failed');
        }
    }

    /**
     * Decrypt face template
     * @param string $encryptedTemplate
     * @return string
     */
    public function decryptFaceTemplate(string $encryptedTemplate): string
    {
        try {
            return Crypt::decryptString($encryptedTemplate);
        } catch (\Exception $e) {
            Log::error('Failed to decrypt face template', ['error' => $e->getMessage()]);
            throw new \Exception('Decryption failed');
        }
    }

    /**
     * Hash RFID card UID (one-way for security)
     * @param string $cardUid
     * @return string
     */
    public function hashRFIDCard(string $cardUid): string
    {
        // Use a simple hash for card UIDs (they need to be comparable)
        // Not using bcrypt because we need deterministic output
        return hash('sha256', $cardUid);
    }

    /**
     * Verify RFID card UID
     * @param string $cardUid
     * @param string $hashedUid
     * @return bool
     */
    public function verifyRFIDCard(string $cardUid, string $hashedUid): bool
    {
        return hash_equals($hashedUid, $this->hashRFIDCard($cardUid));
    }

    /**
     * Hash PIN code
     * @param string $pin
     * @return string
     */
    public function hashPIN(string $pin): string
    {
        return Hash::make($pin);
    }

    /**
     * Verify PIN code
     * @param string $pin
     * @param string $hashedPin
     * @return bool
     */
    public function verifyPIN(string $pin, string $hashedPin): bool
    {
        return Hash::check($pin, $hashedPin);
    }

    /**
     * Sanitize biometric data for storage
     * Removes potentially harmful data
     * @param array $data
     * @return array
     */
    public function sanitizeBiometricData(array $data): array
    {
        $sanitized = [];

        // Only allow specific fields
        $allowedFields = ['fingerprint_template', 'face_template', 'rfid', 'card_id', 'pin'];

        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                // Remove any HTML/script tags
                $sanitized[$field] = strip_tags($data[$field]);
                
                // Remove any SQL injection attempts
                $sanitized[$field] = preg_replace('/[^A-Za-z0-9\-_=+\/]/', '', $sanitized[$field]);
            }
        }

        return $sanitized;
    }

    /**
     * Anonymize biometric data for GDPR compliance
     * Used when staff requests data deletion
     * @param array $data
     * @return array
     */
    public function anonymizeBiometricData(array $data): array
    {
        $anonymized = [];

        foreach ($data as $key => $value) {
            if (in_array($key, ['fingerprint_template', 'face_template'])) {
                $anonymized[$key] = '[DELETED]';
            } elseif (in_array($key, ['rfid', 'card_id'])) {
                $anonymized[$key] = 'XXXXXXXX';
            } elseif ($key === 'pin') {
                $anonymized[$key] = null;
            } else {
                $anonymized[$key] = $value;
            }
        }

        return $anonymized;
    }

    /**
     * Generate secure token for device authentication
     * @return string
     */
    public function generateDeviceToken(): string
    {
        return bin2hex(random_bytes(32));
    }

    /**
     * Validate biometric data integrity
     * @param string $data
     * @return bool
     */
    public function validateDataIntegrity(string $data): bool
    {
        // Check for minimum length
        if (strlen($data) < 10) {
            return false;
        }

        // Check for valid characters (base64 encoded biometric data)
        if (!preg_match('/^[A-Za-z0-9+\/=]+$/', $data)) {
            return false;
        }

        // Check for suspicious patterns
        $suspiciousPatterns = [
            '<script>',
            'javascript:',
            'onclick',
            'onerror',
            'eval(',
            'DROP TABLE',
            'DELETE FROM',
            'UPDATE ',
            'INSERT INTO'
        ];

        foreach ($suspiciousPatterns as $pattern) {
            if (stripos($data, $pattern) !== false) {
                Log::warning('Suspicious pattern detected in biometric data', ['pattern' => $pattern]);
                return false;
            }
        }

        return true;
    }

    /**
     * Encrypt sensitive device configuration
     * @param array $config
     * @return string
     */
    public function encryptDeviceConfig(array $config): string
    {
        try {
            return Crypt::encryptString(json_encode($config));
        } catch (\Exception $e) {
            Log::error('Failed to encrypt device config', ['error' => $e->getMessage()]);
            throw new \Exception('Config encryption failed');
        }
    }

    /**
     * Decrypt device configuration
     * @param string $encryptedConfig
     * @return array
     */
    public function decryptDeviceConfig(string $encryptedConfig): array
    {
        try {
            return json_decode(Crypt::decryptString($encryptedConfig), true);
        } catch (\Exception $e) {
            Log::error('Failed to decrypt device config', ['error' => $e->getMessage()]);
            throw new \Exception('Config decryption failed');
        }
    }
}

