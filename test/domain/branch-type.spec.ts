import { describe, expect, it } from 'vitest';

import { BranchType } from '@domain/branch/branch-type';
import { GitflowDefaults } from '@domain/gitflow/gitflow-defaults';

describe('BranchType', () => {
  describe('rules per type', () => {
    it('feature: starts from develop, no tag, uses timestamp', () => {
      expect(BranchType.feature.prefix).toBe('feature');
      expect(BranchType.feature.startsFrom).toBe(GitflowDefaults.developBranch);
      expect(BranchType.feature.isTagged).toBe(false);
      expect(BranchType.feature.usesTimestamp).toBe(true);
    });

    it('bugfix: starts from develop, no tag, uses timestamp', () => {
      expect(BranchType.bugfix.startsFrom).toBe(GitflowDefaults.developBranch);
      expect(BranchType.bugfix.isTagged).toBe(false);
      expect(BranchType.bugfix.usesTimestamp).toBe(true);
    });

    it('release: starts from develop, tagged, version (no timestamp)', () => {
      expect(BranchType.release.startsFrom).toBe(GitflowDefaults.developBranch);
      expect(BranchType.release.isTagged).toBe(true);
      expect(BranchType.release.usesTimestamp).toBe(false);
    });

    it('hotfix: starts from the main placeholder, tagged, version', () => {
      expect(BranchType.hotfix.startsFrom).toBe(GitflowDefaults.mainBranchPlaceholder);
      expect(BranchType.hotfix.isTagged).toBe(true);
      expect(BranchType.hotfix.usesTimestamp).toBe(false);
    });
  });

  describe('branchFor', () => {
    it('builds prefix/name', () => {
      expect(BranchType.feature.branchFor('login-202601')).toBe('feature/login-202601');
      expect(BranchType.release.branchFor('1.0.0')).toBe('release/1.0.0');
    });
  });

  describe('newBranchFor', () => {
    it('appends a timestamp for timestamped types (feature/bugfix)', () => {
      expect(BranchType.feature.newBranchFor('login')).toMatch(/^feature\/login-\d{12}$/);
      expect(BranchType.bugfix.newBranchFor('fix-modal')).toMatch(/^bugfix\/fix-modal-\d{12}$/);
    });

    it('does not append a timestamp for versioned types (release/hotfix)', () => {
      expect(BranchType.release.newBranchFor('1.0.0')).toBe('release/1.0.0');
      expect(BranchType.hotfix.newBranchFor('1.0.1')).toBe('hotfix/1.0.1');
    });
  });
});
