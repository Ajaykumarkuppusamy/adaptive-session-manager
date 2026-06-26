import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { AdaptiveSessionManager } from '../sessionManager';
import { AdaptiveSessionConfig } from '../types';

describe('AdaptiveSessionManager', () => {
  let config: AdaptiveSessionConfig;
  let manager: AdaptiveSessionManager;
  const SESSION_LENGTH = 15 * 60 * 1000; 

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T12:00:00Z'));

    config = {
      sessionLengthMs: SESSION_LENGTH,
      onExtendSession: vi.fn(),
      onLogout: vi.fn(),
    };

    manager = new AdaptiveSessionManager(config);
  });

  afterEach(() => {
    manager.stop();
    vi.useRealTimers();
  });

  test('should initialize and schedule the first check in Zone 1', () => {
    manager.start();
    vi.advanceTimersByTime(5 * 60 * 1000 - 1000);
    expect(config.onExtendSession).not.toHaveBeenCalled();
    expect(config.onLogout).not.toHaveBeenCalled();
  });

  test('should execute token extension in intermediate zones if activity occurred', () => {
    manager.start();
    vi.advanceTimersByTime(6 * 60 * 1000);
    
    // Simulate user interaction at t = 6 mins
    window.dispatchEvent(new Event('click'));

    vi.advanceTimersByTime(1.5 * 60 * 1000); 
    expect(config.onExtendSession).toHaveBeenCalled();
  });

  test('should activate Lazy Reset in Zone 4 (Critical Zone) and shut down standard intervals', () => {
    manager.start();
    vi.advanceTimersByTime(13.5 * 60 * 1000);
    vi.advanceTimersByTime(30 * 1000); 

    const clickEvent = new Event('click');
    window.dispatchEvent(clickEvent);

    expect(config.onExtendSession).toHaveBeenCalled();
  });

  test('should clear all tracking and trigger onLogout when time expires fully', () => {
    manager.start();
    vi.advanceTimersByTime(SESSION_LENGTH + 1000);
    expect(config.onLogout).toHaveBeenCalledTimes(1);
  });

  test('should trigger token extension on visibilitychange on document', () => {
    manager.start();
    
    // Advance past first check
    vi.advanceTimersByTime(5 * 60 * 1000);
    
    // Simulate user switching back to the tab
    vi.advanceTimersByTime(1 * 60 * 1000);
    document.dispatchEvent(new Event('visibilitychange'));

    vi.advanceTimersByTime(1.5 * 60 * 1000); 
    expect(config.onExtendSession).toHaveBeenCalledTimes(1);
  });

  test('should not trigger multiple token extensions during Lazy Reset due to microtask race conditions', () => {
    manager.start();
    vi.advanceTimersByTime(13.5 * 60 * 1000);
    vi.advanceTimersByTime(30 * 1000); // Now in Zone 4 (Lazy Reset)

    // Simulate multiple concurrent interaction events
    window.dispatchEvent(new Event('click'));
    window.dispatchEvent(new Event('touchstart'));
    document.dispatchEvent(new Event('visibilitychange'));

    expect(config.onExtendSession).toHaveBeenCalledTimes(1);
  });

  test('should execute logout sequence if onExtendSession explicitly returns false', async () => {
    config.onExtendSession = vi.fn().mockResolvedValue(false);
    manager.start();
    
    // Advance past first check
    vi.advanceTimersByTime(5 * 60 * 1000);
    
    // Simulate interaction at t = 6 mins
    vi.advanceTimersByTime(1 * 60 * 1000);
    window.dispatchEvent(new Event('click'));
    
    // Advance to next check at t = 7.5 mins
    await vi.advanceTimersByTimeAsync(1.5 * 60 * 1000);
    
    expect(config.onLogout).toHaveBeenCalledTimes(1);
  });
});