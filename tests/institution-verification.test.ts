import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the Clarity contract environment
const mockContractEnv = {
  blockHeight: 100,
  txSender: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
  verifiedInstitutions: new Map()
};

// Mock contract functions
const contractFunctions = {
  registerInstitution: (institutionId, name, website) => {
    if (mockContractEnv.txSender !== mockContractEnv.txSender) {
      return { error: 403 };
    }
    
    mockContractEnv.verifiedInstitutions.set(institutionId, {
      name,
      website,
      verified: false,
      verificationDate: 0
    });
    
    return { success: true };
  },
  
  verifyInstitution: (institutionId) => {
    if (mockContractEnv.txSender !== mockContractEnv.txSender) {
      return { error: 403 };
    }
    
    if (!mockContractEnv.verifiedInstitutions.has(institutionId)) {
      return { error: 404 };
    }
    
    const institution = mockContractEnv.verifiedInstitutions.get(institutionId);
    institution.verified = true;
    institution.verificationDate = mockContractEnv.blockHeight;
    mockContractEnv.verifiedInstitutions.set(institutionId, institution);
    
    return { success: true };
  },
  
  isInstitutionVerified: (institutionId) => {
    if (!mockContractEnv.verifiedInstitutions.has(institutionId)) {
      return { error: 404 };
    }
    
    const institution = mockContractEnv.verifiedInstitutions.get(institutionId);
    return { success: institution.verified };
  },
  
  getInstitutionDetails: (institutionId) => {
    return mockContractEnv.verifiedInstitutions.get(institutionId) || null;
  }
};

describe('Institution Verification Contract', () => {
  beforeEach(() => {
    mockContractEnv.verifiedInstitutions.clear();
    mockContractEnv.blockHeight = 100;
  });
  
  it('should register a new institution', () => {
    const result = contractFunctions.registerInstitution(
        'harvard-001',
        'Harvard University',
        'https://harvard.edu'
    );
    
    expect(result.success).toBe(true);
    expect(mockContractEnv.verifiedInstitutions.has('harvard-001')).toBe(true);
    
    const institution = mockContractEnv.verifiedInstitutions.get('harvard-001');
    expect(institution.name).toBe('Harvard University');
    expect(institution.verified).toBe(false);
  });
  
  it('should verify an institution', () => {
    // First register the institution
    contractFunctions.registerInstitution(
        'mit-001',
        'Massachusetts Institute of Technology',
        'https://mit.edu'
    );
    
    // Then verify it
    const result = contractFunctions.verifyInstitution('mit-001');
    
    expect(result.success).toBe(true);
    
    const institution = mockContractEnv.verifiedInstitutions.get('mit-001');
    expect(institution.verified).toBe(true);
    expect(institution.verificationDate).toBe(100);
  });
  
  it('should check if an institution is verified', () => {
    // Register and verify an institution
    contractFunctions.registerInstitution(
        'stanford-001',
        'Stanford University',
        'https://stanford.edu'
    );
    contractFunctions.verifyInstitution('stanford-001');
    
    // Check verification status
    const result = contractFunctions.isInstitutionVerified('stanford-001');
    
    expect(result.success).toBe(true);
  });
  
  it('should return error for non-existent institution', () => {
    const result = contractFunctions.isInstitutionVerified('nonexistent-001');
    
    expect(result.error).toBe(404);
  });
});
