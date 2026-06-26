# 🛡️ Adaptive Session Manager

A highly optimized, framework-agnostic TypeScript engine for managing secure frontend sessions without sacrificing UI performance. 

Unlike traditional session managers that rely on heavy polling or constant main-thread event tracking, this package utilizes a **Dynamic Evaluation Loop** and a unique **Lazy Reset Architecture** to save CPU cycles and prevent memory leaks.

Perfect for **Angular**, **React**, **Vue**, and **Vanilla JS** applications.

---

## ✨ Key Features

- **🚀 Lazy Reset Architecture:** Shuts down background polling during the final minutes of a session, switching to a single, lightweight event listener to save CPU overhead.
- **⚡ Framework Agnostic:** Pure TypeScript. Works seamlessly across any modern web framework.
- **🧹 Memory Safe:** Automatically cleans up all event listeners and timeouts when a session terminates.
- **⏱️ Event-Driven Timeline:** Adapts its evaluation checks based on how close the user is to the session expiration (Safe Zone -> Warning Zone -> Critical Zone).

---

## 📦 Installation

bash
npm install adaptive-session-manager


---

## 🧠 How It Works (The Timeline)

The manager divides your session into dynamic zones. It checks activity less frequently when time is abundant, and more frequently as time runs out, culminating in the "Lazy Reset" critical zone.

text
0 min                  5 min                 10 min                13 min         15 min
 ├──────────────────────┼──────────────────────┼──────────────────────┼──────────────┤
 │      ZONE 1          │      ZONE 2          │      ZONE 3          │    ZONE 4    │
 │   (Safe Zone)        │   (Warning Zone)     │    (Urgent Zone)     │  (Critical)  │
 ├──────────────────────┼──────────────────────┼──────────────────────┼──────────────┤
 │ Check once at 5m     │ Check every 2.5m     │ Check every 1m       │ Lazy Reset   │
 │                      │                      │                      │ (On Activity)│


---

## 💻 Usage Examples

### 1. Angular Implementation

*Pro-tip: Run the session tracking outside the Angular zone to prevent `mousemove` or `scroll` events from triggering constant UI re-rendering.*

typescript
import { Injectable, NgZone } from '@angular/core';
import { AdaptiveSessionManager } from 'adaptive-session-manager';

@Injectable({ providedIn: 'root' })
export class SessionTrackingService {
  private manager: AdaptiveSessionManager;

  constructor(private ngZone: NgZone) {
    this.ngZone.runOutsideAngular(() => {
      this.manager = new AdaptiveSessionManager({
        sessionLengthMs: 15 * 60 * 1000, // 15 Minutes
        onExtendSession: () => this.pingBackendToExtendToken(),
        onLogout: () => this.handleSecureLogout()
      });
      
      this.manager.start();
    });
  }

  private pingBackendToExtendToken() {
    // Call your API to refresh the JWT
    console.log("Token extended!");
  }

  private handleSecureLogout() {
    this.ngZone.run(() => {
      // Clear localStorage, hit backend logout endpoint, and redirect
      console.log("User logged out securely.");
    });
  }
}


### 2. React Implementation

*Use inside a `useEffect` at the root of your application (e.g., `App.tsx` or an AuthProvider).*

tsx
import { useEffect } from 'react';
import { AdaptiveSessionManager } from 'adaptive-session-manager';

export function useSessionTracker() {
  useEffect(() => {
    const manager = new AdaptiveSessionManager({
      sessionLengthMs: 15 * 60 * 1000, // 15 Minutes
      onExtendSession: async () => {
        // e.g., await api.post('/refresh-token');
      },
      onLogout: () => {
        localStorage.clear();
        window.location.href = '/login';
      }
    });

    manager.start();

    // Cleanup on unmount
    return () => manager.stop();
  }, []);
}


### 3. Vanilla JavaScript

javascript
import { AdaptiveSessionManager } from 'adaptive-session-manager';

const sessionManager = new AdaptiveSessionManager({
  sessionLengthMs: 900000, // 15 minutes in ms
  activityEvents: ['click', 'scroll', 'keypress'], // Optional: override default events
  onExtendSession: () => {
    fetch('/api/extend-session', { method: 'POST' });
  },
  onLogout: () => {
    alert('Session expired due to inactivity.');
    window.location.href = '/logout';
  }
});

sessionManager.start();


---

## ⚙️ Configuration API

| Property | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `sessionLengthMs` | `number` | **Yes** | `undefined` | Total length of the session in milliseconds. |
| `onExtendSession` | `function` | **Yes** | `undefined` | Callback fired when the user interacts and the backend token needs extending. Can return a `Promise`. |
| `onLogout` | `function` | **Yes** | `undefined` | Callback fired when time runs out completely. Put your frontend clearing logic here. |
| `activityEvents` | `string[]` | No | `['click', 'keypress', 'scroll', 'touchstart']` | Array of DOM events that indicate user activity. |

---

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

1. Clone the repo
2. Run `npm install`
3. Run `npm test` to execute the Vitest suite

## 📄 License

[MIT](https://choosealicense.com/licenses/mit/)
