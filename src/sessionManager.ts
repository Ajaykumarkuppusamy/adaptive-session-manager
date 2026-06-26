import { AdaptiveSessionConfig } from './types';

export class AdaptiveSessionManager {
  private lastActive: number = Date.now();
  private lastExtended: number = Date.now();
  private timerId: ReturnType<typeof setTimeout> | undefined;
  private isLazyListenerAttached = false;

  constructor(private config: AdaptiveSessionConfig) {
    this.config.activityEvents = config.activityEvents || ['click', 'keypress', 'scroll', 'touchstart'];
  }

  public start(): void {
    this.lastActive = Date.now();
    this.lastExtended = Date.now();
    this.setupGlobalEventListeners();
    this.runEvaluatorLoop();
  }

  public stop(): void {
    clearTimeout(this.timerId);
    this.removeGlobalEventListeners();
    this.removeLazyResetListener();
  }

  private recordActivity = (): void => {
    this.lastActive = Date.now();
  };

  private setupGlobalEventListeners(): void {
    this.config.activityEvents!.forEach(event => {
      window.addEventListener(event, this.recordActivity, { passive: true });
    });
    document.addEventListener('visibilitychange', this.recordActivity);
  }

  private removeGlobalEventListeners(): void {
    this.config.activityEvents!.forEach(event => {
      window.removeEventListener(event, this.recordActivity);
    });
    document.removeEventListener('visibilitychange', this.recordActivity);
  }

  private runEvaluatorLoop = (): void => {
    clearTimeout(this.timerId);
    
    const timeRemaining = this.config.sessionLengthMs - (Date.now() - this.lastExtended);

    if (timeRemaining <= 0) {
      this.executeLogoutSequence();
      return;
    }

    const totalTime = this.config.sessionLengthMs;
    const zone1Threshold = totalTime * (2 / 3); 
    const zone2Threshold = totalTime * (1 / 3); 
    const criticalThreshold = 2 * 60 * 1000;    

    let nextCheckInterval = 5 * 60 * 1000; 

    if (timeRemaining <= criticalThreshold) {
      this.activateLazyReset(timeRemaining);
      return; 
    } 
    else if (timeRemaining <= zone2Threshold) {
      nextCheckInterval = 1 * 60 * 1000; 
      this.evaluateAndPingIfNeeded();
    } 
    else if (timeRemaining <= zone1Threshold) {
      nextCheckInterval = 2.5 * 60 * 1000; 
      this.evaluateAndPingIfNeeded();
    } 
    else {
      nextCheckInterval = 5 * 60 * 1000; 
    }

    this.timerId = setTimeout(this.runEvaluatorLoop, nextCheckInterval);
  };

  private evaluateAndPingIfNeeded(): void {
    if (this.lastActive > this.lastExtended) {
      this.triggerTokenExtension();
    }
  }

  private activateLazyReset(timeRemaining: number): void {
    if (this.isLazyListenerAttached) return;
    this.isLazyListenerAttached = true;

    this.config.activityEvents!.forEach(event => {
      window.addEventListener(event, this.handleLazyInteraction, { once: true, passive: true });
    });
    document.addEventListener('visibilitychange', this.handleLazyInteraction, { once: true });
    
    this.timerId = setTimeout(() => this.executeLogoutSequence(), timeRemaining);
  }

  private handleLazyInteraction = (): void => {
    if (!this.isLazyListenerAttached) return;
    this.removeLazyResetListener();
    this.triggerTokenExtension();
    this.runEvaluatorLoop(); 
  };

  private removeLazyResetListener(): void {
    this.isLazyListenerAttached = false;
    this.config.activityEvents!.forEach(event => {
      window.removeEventListener(event, this.handleLazyInteraction);
    });
    document.removeEventListener('visibilitychange', this.handleLazyInteraction);
  }

  private async triggerTokenExtension(): Promise<void> {
    this.lastExtended = Date.now();
    const success = await this.config.onExtendSession();
    if (success === false) {
      this.executeLogoutSequence();
    }
  }

  private executeLogoutSequence(): void {
    this.stop(); 
    this.config.onLogout(); 
  }
}