/**
 * Verification test script for customer photo upload utilities
 * Run with: node scripts/verify-photo-features.js
 */

const assert = require('assert');

// 1. Test photo validation logic
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB

function validateCustomerPhoto(fileSize, mimeType, fileName) {
  if (!fileSize || fileSize <= 0) {
    return { valid: false, error: 'Photo file is empty.' };
  }
  if (fileSize > MAX_FILE_SIZE) {
    return { valid: false, error: 'Photo exceeds maximum allowed size of 15 MB.' };
  }
  if (!ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
    return { valid: false, error: `Invalid image format (${mimeType}). Allowed formats: JPG, JPEG, PNG, WebP.` };
  }
  const extMatch = fileName.toLowerCase().match(/\.[^.]+$/);
  const ext = extMatch ? extMatch[0] : '';
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: `Invalid file extension (${ext}). Allowed: .jpg, .jpeg, .png, .webp.` };
  }
  return { valid: true };
}

function sanitizePhotoFileName(fileName) {
  const baseName = fileName.replace(/^.*[\\\/]/, '');
  const extMatch = baseName.match(/\.[^.]+$/);
  const ext = extMatch ? extMatch[0].toLowerCase() : '.jpg';
  const nameWithoutExt = baseName.replace(/\.[^.]+$/, '');
  const cleanName = nameWithoutExt
    .replace(/[^a-zA-Z0-9_\-\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 50) || 'customer-photo';
  return `${cleanName}${ext}`;
}

console.log('--- Running Customer Photo Upload Verification Tests ---');

// Test 1: Valid photo
const t1 = validateCustomerPhoto(5 * 1024 * 1024, 'image/jpeg', 'portrait.jpg');
assert.strictEqual(t1.valid, true, 'Test 1 failed: Valid photo should pass');
console.log('✓ Test 1 Passed: Valid photo passes validation');

// Test 2: File size > 15MB
const t2 = validateCustomerPhoto(16 * 1024 * 1024, 'image/png', 'huge.png');
assert.strictEqual(t2.valid, false, 'Test 2 failed: 16MB photo should fail');
assert.ok(t2.error.includes('15 MB'), 'Test 2 error message incorrect');
console.log('✓ Test 2 Passed: 16MB file correctly rejected');

// Test 3: Invalid mime type (e.g. PDF)
const t3 = validateCustomerPhoto(1024, 'application/pdf', 'document.pdf');
assert.strictEqual(t3.valid, false, 'Test 3 failed: PDF should fail');
console.log('✓ Test 3 Passed: PDF mime type correctly rejected');

// Test 4: Mismatched extension
const t4 = validateCustomerPhoto(1024, 'image/jpeg', 'virus.exe');
assert.strictEqual(t4.valid, false, 'Test 4 failed: .exe should fail');
console.log('✓ Test 4 Passed: .exe extension correctly rejected');

// Test 5: Path traversal attack sanitization
const s1 = sanitizePhotoFileName('../../etc/passwd.jpg');
assert.ok(!s1.includes('/'), 'Test 5 failed: Path separators must be stripped');
assert.ok(!s1.includes('..'), 'Test 5 failed: Parent directory dots must be stripped');
console.log(`✓ Test 5 Passed: Path traversal stripped -> "${s1}"`);

// Test 6: Special characters sanitization
const s2 = sanitizePhotoFileName('<script>alert("xss")</script>.png');
assert.ok(!s2.includes('<') && !s2.includes('>'), 'Test 6 failed: HTML tags must be stripped');
console.log(`✓ Test 6 Passed: Special characters stripped -> "${s2}"`);

// Test 7: Space normalization
const s3 = sanitizePhotoFileName('my wedding photo 2024.webp');
assert.strictEqual(s3, 'my-wedding-photo-2024.webp', 'Test 7 failed: Spaces should become dashes');
console.log(`✓ Test 7 Passed: Spaces normalized -> "${s3}"`);

console.log('\nAll customer photo upload verification tests PASSED successfully!\n');
