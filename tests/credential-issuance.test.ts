import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the Clarity contract environment
const mockContractEnv = {
  blockHeight: 100,
  txSender: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
  institutionVerificationContract: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
  authorizedInstitutions: new Map(),
  credentials: new Map()
};

// Mock contract functions
const contractFunctions = {
  authorizeInstitution: (institutionId) => {
    if (mockContractEnv.txSender !== mockContractEnv.institutionVerificationContract) {
      return { error: 403 };
    }
    
    mockContractEnv.authorizedInstitutions.set(institutionId, { authorized: true });
    return { success: true };
  },
  
  isInstitutionAuthorized: (institutionId) => {
    return mockContractEnv.authorizedInstitutions.get(institutionId) || { authorized: false };
  },
  
  issueCredential: (credentialHash, institutionId, studentId, credentialType, expirationDate, metadata) => {
    const institution = mockContractEnv.authorizedInstitutions.get(institutionId);
    
    if (!institution || !institution.authorized) {
      return { error: 403 };
    }
    
    mockContractEnv.credentials.set(credentialHash, {
      institutionId,
      studentId,
      credentialType,
      issueDate: mockContractEnv.blockHeight,
      expirationDate,
      metadata
    });
    
    return { success: true };
  },
  
  verifyCredential: (credentialHash) => {
    if (!mockContractEnv.credentials.has(credentialHash)) {
      return { error: 404 };
    }
    
    const credential = mockContractEnv.credentials.get(credentialHash);
    return {
      success: {
        valid: mockContractEnv.blockHeight < credential.expirationDate,
        credential
      }
    };
  },
  
  revokeCredential: (credentialHash) => {
    if (mockContractEnv.txSender !== mockContractEnv.institutionVerificationContract) {
      return { error: 403 };
    }
    
    if (!mockContractEnv.credentials.has(credentialHash)) {
      return { error: 404 };
    }
    
    const credential = mockContractEnv.credentials.get(credentialHash);
    credential.expirationDate = mockContractEnv.blockHeight;
    mockContractEnv.credentials.set(credentialHash, credential);
    
    return { success: true };
  }
};

describe('Credential Issuance Contract', () => {
  beforeEach(() => {
    mockContractEnv.authorizedInstitutions.clear();
    mockContractEnv.credentials.clear();
    mockContractEnv.blockHeight = 100;
  });
  
  it('should authorize an institution', () => {
    const result = contractFunctions.authorizeInstitution('harvard-001');
    
    expect(result.success).toBe(true);
    expect(mockContractEnv.authorizedInstitutions.has('harvard-001')).toBe(true);
    expect(mockContractEnv.authorizedInstitutions.get('harvard-001').authorized).toBe(true);
  });
  
  it('should issue a credential for an authorized institution', () => {
    // First authorize the institution
    contractFunctions.authorizeInstitution('mit-001');
    
    // Then issue a credential
    const credentialHash = 'abcdef1234567890';
    const result = contractFunctions.issueCredential(
        credentialHash,
        'mit-001',
        'student-123',
        'bachelor',
        200, // expiration date
        'Computer Science Degree'
    );
    
    expect(result.success).toBe(true);
    expect(mockContractEnv.credentials.has(credentialHash)).toBe(true);
    
    const credential = mockContractEnv.credentials.get(credentialHash);
    expect(credential.institutionId).toBe('mit-001');
    expect(credential.studentId).toBe('student-123');
    expect(credential.credentialType).toBe('bachelor');
  });
  
  it('should verify a valid credential', () => {
    // Authorize institution and issue credential
    contractFunctions.authorizeInstitution('stanford-001');
    const credentialHash = 'stanford-credential-123';
    contractFunctions.issueCredential(
        credentialHash,
        'stanford-001',
        'student-456',
        'master',
        200, // expiration date (future)
        'Master in AI'
    );
    
    // Verify the credential
    const result = contractFunctions.verifyCredential(credentialHash);
    
    expect(result.success.valid).toBe(true);
    expect(result.success.credential.credentialType).toBe('master');
  });
  
  it('should mark expired credentials as invalid', () => {
    // Authorize institution and issue credential
    contractFunctions.authorizeInstitution('yale-001');
    const credentialHash = 'yale-credential-123';
    contractFunctions.issueCredential(
        credentialHash,
        'yale-001',
        'student-789',
        'phd',
        50, // expiration date (past)
        'PhD in Physics'
    );
    
    // Verify the credential
    const result = contractFunctions.verifyCredential(credentialHash);
    
    expect(result.success.valid).toBe(false);
  });
  
  it('should revoke a credential', () => {
    // Authorize institution and issue credential
    contractFunctions.authorizeInstitution('columbia-001');
    const credentialHash = 'columbia-credential-123';
    contractFunctions.issueCredential(
        credentialHash,
        'columbia-001',
        'student-101',
        'bachelor',
        300, // expiration date (future)
        'Bachelor in Economics'
    );
    
    // Revoke the credential
    const result = contractFunctions.revokeCredential(credentialHash);
    
    expect(result.success).toBe(true);
    
    // Verify the credential is now invalid
    const verifyResult = contractFunctions.verifyCredential(credentialHash);
    expect(verifyResult.success.valid).toBe(false);
  });
});
