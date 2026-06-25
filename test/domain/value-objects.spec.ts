import { describe, expect, it } from 'vitest';

import { BranchCommitMessage } from '@domain/branch/branch-commit-message';
import { BranchName } from '@domain/branch/branch-name';
import { BranchTag } from '@domain/branch/branch-tag';
import { BranchVersion } from '@domain/branch/branch-version';

describe('BranchName', () => {
  it('accepts a valid lowercase slug', () => {
    expect(new BranchName('login-oauth').value).toBe('login-oauth');
    expect(new BranchName('fix_modal.2').value).toBe('fix_modal.2');
  });

  it('rejects empty', () => {
    expect(() => new BranchName('')).toThrow(/cannot be empty/);
    expect(() => new BranchName('   ')).toThrow(/cannot be empty/);
  });

  it('rejects uppercase (no hidden lowercasing)', () => {
    expect(() => new BranchName('Mi-Feature')).toThrow(/Invalid name/);
  });

  it('rejects spaces and accents (must be a valid slug already)', () => {
    expect(() => new BranchName('mi feature')).toThrow(/Invalid name/);
    expect(() => new BranchName('añadir')).toThrow(/Invalid name/);
  });

  it('rejects a leading dash (cannot be read as a git option)', () => {
    expect(() => new BranchName('-rf')).toThrow(/Invalid name/);
    expect(() => new BranchName('--force')).toThrow(/Invalid name/);
  });

  it('rejects names that git itself forbids (.., //, trailing /, ., .lock)', () => {
    expect(() => new BranchName('a..b')).toThrow(/\.\./);
    expect(() => new BranchName('a//b')).toThrow(/\/\//);
    expect(() => new BranchName('a/')).toThrow(/end with '\/'/);
    expect(() => new BranchName('a.')).toThrow(/end with '\.'/);
    expect(() => new BranchName('a.lock')).toThrow(/\.lock/);
  });

  it('check returns a message or undefined without constructing', () => {
    expect(BranchName.check('valid-name')).toBeUndefined();
    expect(BranchName.check('Invalid Name')).toBeDefined();
  });
});

describe('BranchVersion', () => {
  it('accepts strict 3-component SemVer', () => {
    expect(new BranchVersion('1.0.0').value).toBe('1.0.0');
    expect(new BranchVersion('2.10.3-rc1').value).toBe('2.10.3-rc1');
  });

  it('rejects 2-component or 4-component versions', () => {
    expect(() => new BranchVersion('1.0')).toThrow(/Invalid version/);
    expect(() => new BranchVersion('1.0.0.0')).toThrow(/Invalid version/);
  });

  it('rejects a version that looks like a git option', () => {
    expect(() => new BranchVersion('--evil')).toThrow(/Invalid version/);
    expect(() => new BranchVersion('-rf')).toThrow(/Invalid version/);
  });

  it('rejects letters or spaces', () => {
    expect(() => new BranchVersion('v1.0.0')).toThrow(/Invalid version/);
    expect(() => new BranchVersion('1.0.0 beta')).toThrow(/Invalid version/);
  });
});

describe('BranchTag', () => {
  it('builds the tag with the conventional v prefix', () => {
    const tag = new BranchTag(new BranchVersion('1.0.0'));
    expect(tag.value).toBe('v1.0.0');
  });
});

describe('BranchCommitMessage', () => {
  it('accepts a non-empty message', () => {
    expect(new BranchCommitMessage('Release v1.0.0').value).toBe('Release v1.0.0');
  });

  it('rejects empty', () => {
    expect(() => new BranchCommitMessage('')).toThrow(/cannot be empty/);
  });
});
