/**
 * Mahjong Living Simulation - Native App Helpers
 * Capacitor/Electron detection and native feature integration.
 */
(function (root) {
  'use strict';

  var MJ = root.MJ = root.MJ || {};

  // -------------------------------------------------------------------------
  // NativeApp class
  // -------------------------------------------------------------------------

  function NativeApp() {
    this._panel = null;
    this._deferredInstallPrompt = null;
    this._initInstallPrompt();
  }

  // -------------------------------------------------------------------------
  // Platform detection
  // -------------------------------------------------------------------------

  /**
   * Returns true if running inside Capacitor or Electron (not a plain browser).
   */
  NativeApp.prototype.isNative = function () {
    return this.isCapacitor() || this.isElectron();
  };

  /**
   * Detect Capacitor runtime.
   */
  NativeApp.prototype.isCapacitor = function () {
    return !!(root.Capacitor && root.Capacitor.isNativePlatform && root.Capacitor.isNativePlatform());
  };

  /**
   * Detect Electron runtime.
   */
  NativeApp.prototype.isElectron = function () {
    return !!(typeof process !== 'undefined' && process.versions && process.versions.electron);
  };

  /**
   * Detect if running as an installed PWA.
   */
  NativeApp.prototype.isPWA = function () {
    return (root.matchMedia && root.matchMedia('(display-mode: standalone)').matches) ||
           (root.navigator && root.navigator.standalone === true);
  };

  // -------------------------------------------------------------------------
  // Notifications
  // -------------------------------------------------------------------------

  /**
   * Request notification permission. Returns a promise resolving to the permission state.
   */
  NativeApp.prototype.requestNotificationPermission = function () {
    if (!('Notification' in root)) {
      return Promise.resolve('unsupported');
    }
    if (Notification.permission === 'granted') {
      return Promise.resolve('granted');
    }
    return Notification.requestPermission().then(function (perm) {
      return perm;
    });
  };

  /**
   * Schedule a local reminder notification after a delay.
   * @param {string} message - Notification body text.
   * @param {number} delayMs - Delay in milliseconds.
   */
  NativeApp.prototype.scheduleReminder = function (message, delayMs) {
    var self = this;

    // Capacitor local notifications
    if (this.isCapacitor() && root.Capacitor.Plugins && root.Capacitor.Plugins.LocalNotifications) {
      return root.Capacitor.Plugins.LocalNotifications.schedule({
        notifications: [{
          title: 'Mahjong Living Simulation',
          body: message,
          id: Date.now(),
          schedule: { at: new Date(Date.now() + delayMs) }
        }]
      });
    }

    // Fallback: browser setTimeout + Notification API
    return this.requestNotificationPermission().then(function (perm) {
      if (perm === 'granted') {
        setTimeout(function () {
          try {
            new Notification('Mahjong Living Simulation', { body: message });
          } catch (e) {
            // ignore - some browsers restrict Notification constructor
          }
        }, delayMs);
        return 'scheduled';
      }
      return 'permission_denied';
    });
  };

  // -------------------------------------------------------------------------
  // Sharing
  // -------------------------------------------------------------------------

  /**
   * Share text/URL via native share sheet or Web Share API.
   * @param {string} text - The text to share.
   * @param {string} [url] - Optional URL.
   */
  NativeApp.prototype.shareGame = function (text, url) {
    var shareData = { title: 'Mahjong Living Simulation', text: text };
    if (url) {
      shareData.url = url;
    }

    // Capacitor share plugin
    if (this.isCapacitor() && root.Capacitor.Plugins && root.Capacitor.Plugins.Share) {
      return root.Capacitor.Plugins.Share.share(shareData);
    }

    // Web Share API
    if (navigator.share) {
      return navigator.share(shareData).catch(function () {
        // user cancelled or API error, ignore
      });
    }

    // Fallback: copy to clipboard
    var fullText = text + (url ? '\n' + url : '');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(fullText).then(function () {
        return 'copied';
      });
    }

    return Promise.resolve('unsupported');
  };

  // -------------------------------------------------------------------------
  // Haptics
  // -------------------------------------------------------------------------

  /**
   * Trigger haptic feedback on supported devices.
   * @param {string} type - 'light', 'medium', 'heavy', or 'selection'
   */
  NativeApp.prototype.hapticFeedback = function (type) {
    type = type || 'medium';

    // Capacitor haptics
    if (this.isCapacitor() && root.Capacitor.Plugins && root.Capacitor.Plugins.Haptics) {
      var style = { light: 'LIGHT', medium: 'MEDIUM', heavy: 'HEAVY' };
      return root.Capacitor.Plugins.Haptics.impact({ style: style[type] || 'MEDIUM' });
    }

    // Vibration API fallback
    if (navigator.vibrate) {
      var durations = { light: 10, medium: 25, heavy: 50, selection: 5 };
      navigator.vibrate(durations[type] || 25);
    }
  };

  // -------------------------------------------------------------------------
  // Device info
  // -------------------------------------------------------------------------

  /**
   * Gather device information.
   * @returns {{ width: number, height: number, pixelRatio: number, platform: string, darkMode: boolean, standalone: boolean }}
   */
  NativeApp.prototype.getDeviceInfo = function () {
    return {
      width: root.innerWidth || 0,
      height: root.innerHeight || 0,
      pixelRatio: root.devicePixelRatio || 1,
      platform: this.isCapacitor() ? 'capacitor' : this.isElectron() ? 'electron' : this.isPWA() ? 'pwa' : 'browser',
      darkMode: !!(root.matchMedia && root.matchMedia('(prefers-color-scheme: dark)').matches),
      standalone: this.isPWA()
    };
  };

  // -------------------------------------------------------------------------
  // PWA install prompt
  // -------------------------------------------------------------------------

  NativeApp.prototype._initInstallPrompt = function () {
    var self = this;
    root.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      self._deferredInstallPrompt = e;
    });
  };

  // -------------------------------------------------------------------------
  // UI
  // -------------------------------------------------------------------------

  /**
   * Build a native features UI panel and append it to the given container.
   */
  NativeApp.prototype.buildNativeUI = function (container) {
    var self = this;
    container = container || document.body;

    var panel = document.createElement('div');
    panel.className = 'native-app-panel';
    panel.style.cssText = 'padding:12px;background:#1a1a2e;border-radius:8px;color:#e0e0e0;font-family:sans-serif;font-size:14px;max-width:340px;';

    var title = document.createElement('h3');
    title.textContent = 'App Settings';
    title.style.cssText = 'margin:0 0 10px;color:#ffd700;';
    panel.appendChild(title);

    // Platform info
    var info = this.getDeviceInfo();
    var infoEl = document.createElement('div');
    infoEl.style.cssText = 'margin-bottom:8px;font-size:12px;color:#aaa;';
    infoEl.textContent = 'Platform: ' + info.platform + ' | ' + info.width + 'x' + info.height + (info.darkMode ? ' | Dark mode' : '');
    panel.appendChild(infoEl);

    // Install PWA button
    if (!this.isNative() && !this.isPWA() && this._deferredInstallPrompt) {
      var installBtn = document.createElement('button');
      installBtn.textContent = 'Install as App';
      installBtn.style.cssText = 'display:block;width:100%;padding:8px;margin-bottom:6px;background:#4a6fa5;color:#fff;border:none;border-radius:4px;cursor:pointer;';
      installBtn.addEventListener('click', function () {
        if (self._deferredInstallPrompt) {
          self._deferredInstallPrompt.prompt();
          self._deferredInstallPrompt.userChoice.then(function (result) {
            if (result.outcome === 'accepted') {
              installBtn.textContent = 'Installed!';
              installBtn.disabled = true;
            }
            self._deferredInstallPrompt = null;
          });
        }
      });
      panel.appendChild(installBtn);
    }

    // Notification toggle
    var notifBtn = document.createElement('button');
    notifBtn.textContent = 'Enable Notifications';
    notifBtn.style.cssText = 'display:block;width:100%;padding:8px;margin-bottom:6px;background:#2d6a4f;color:#fff;border:none;border-radius:4px;cursor:pointer;';
    notifBtn.addEventListener('click', function () {
      self.requestNotificationPermission().then(function (perm) {
        notifBtn.textContent = perm === 'granted' ? 'Notifications Enabled' : 'Notifications: ' + perm;
      });
    });
    panel.appendChild(notifBtn);

    // Share button
    var shareBtn = document.createElement('button');
    shareBtn.textContent = 'Share Game';
    shareBtn.style.cssText = 'display:block;width:100%;padding:8px;margin-bottom:6px;background:#6a4c2d;color:#fff;border:none;border-radius:4px;cursor:pointer;';
    shareBtn.addEventListener('click', function () {
      self.shareGame('Check out Mahjong Living Simulation!', root.location.href);
    });
    panel.appendChild(shareBtn);

    // Replace existing panel
    if (this._panel && this._panel.parentNode) {
      this._panel.parentNode.removeChild(this._panel);
    }
    this._panel = panel;
    container.appendChild(panel);

    return panel;
  };

  // -------------------------------------------------------------------------
  // Export
  // -------------------------------------------------------------------------

  MJ.NativeApp = NativeApp;

})(typeof window !== 'undefined' ? window : this);
