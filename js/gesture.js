// ============================================================
// gesture.js — MediaPipe Hands Gesture Detection
// Smart Learning Assistant
// ============================================================

export class GestureEngine {
  constructor(onGesture) {
    this.onGesture = onGesture; // Callback when a gesture is recognized
    this.isActive = false;
    this.lastGesture = null;
    this.gestureTimeout = null;
    this.initDOM();
  }

  initDOM() {
    this.$video = document.getElementById('gesture-video');
    this.$canvas = document.getElementById('gesture-canvas');
    this.ctx = this.$canvas ? this.$canvas.getContext('2d') : null;
  }

  async start() {
    if (!this.$video || !this.$canvas) {
      console.warn("Gesture DOM elements not found. Cannot start GestureEngine.");
      return;
    }
    this.isActive = true;

    // Load Hands from global window object (provided by CDN)
    if (!window.Hands || !window.Camera) {
      console.error("MediaPipe scripts not loaded!");
      return;
    }

    this.hands = new window.Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/${file}`
    });

    this.hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7
    });

    this.hands.onResults((results) => this.onResults(results));

    // Initialize Camera feed
    this.camera = new window.Camera(this.$video, {
      onFrame: async () => {
        if (this.isActive) {
          await this.hands.send({ image: this.$video });
        }
      },
      width: 320,
      height: 240
    });
    
    try {
      await this.camera.start();
      console.log("Gesture Camera started successfully.");
    } catch (err) {
      console.error("Error starting Gesture Camera:", err);
    }
  }

  stop() {
    this.isActive = false;
    if (this.camera) {
      this.camera.stop();
    }
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.$canvas.width, this.$canvas.height);
    }
    if (this.hands) {
      this.hands.close();
    }
  }

  onResults(results) {
    if (!this.isActive) return;

    this.ctx.save();
    this.ctx.clearRect(0, 0, this.$canvas.width, this.$canvas.height);

    // Draw video feed onto canvas (mirror view for UX)
    this.ctx.translate(this.$canvas.width, 0);
    this.ctx.scale(-1, 1);
    this.ctx.drawImage(results.image, 0, 0, this.$canvas.width, this.$canvas.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      for (const landmarks of results.multiHandLandmarks) {
        // Draw landmarks connecting lines
        if (window.drawConnectors && window.HAND_CONNECTIONS) {
            window.drawConnectors(this.ctx, landmarks, window.HAND_CONNECTIONS, { color: '#6c63ff', lineWidth: 4 });
        }
        if (window.drawLandmarks) {
            window.drawLandmarks(this.ctx, landmarks, { color: '#f59e0b', lineWidth: 2, radius: 4 });
        }

        this.detectGesture(landmarks);
      }
    }
    this.ctx.restore();
  }

  detectGesture(landmarks) {
    // MediaPipe Hand Landmarks:
    // 0: WRIST
    // 4: THUMB_TIP, 3: THUMB_IP, 2: THUMB_MCP, 1: THUMB_CMC
    // 8: INDEX_FINGER_TIP, 6: INDEX_FINGER_PIP, 5: INDEX_FINGER_MCP
    // 12: MIDDLE_FINGER_TIP, 10: MIDDLE_FINGER_PIP
    // 16: RING_FINGER_TIP, 14: RING_FINGER_PIP
    // 20: PINKY_TIP, 18: PINKY_PIP

    // Check if the tip is above (lower Y value) its corresponding PIP
    const isTipAbovePip = (tip, pip) => landmarks[tip].y < landmarks[pip].y;

    const indexExtended = isTipAbovePip(8, 6);
    const middleExtended = isTipAbovePip(12, 10);
    const ringExtended = isTipAbovePip(16, 14);
    const pinkyExtended = isTipAbovePip(20, 18);

    const indexFolded = !indexExtended;
    const middleFolded = !middleExtended;
    const ringFolded = !ringExtended;
    const pinkyFolded = !pinkyExtended;

    let gestureObj = null;

    // 1. Open Palm (Stop)
    if (indexExtended && middleExtended && ringExtended && pinkyExtended) {
      gestureObj = "stop"; 
    }
    // 2. Peace Sign (Next / Quiz Me)
    else if (indexExtended && middleExtended && ringFolded && pinkyFolded) {
      gestureObj = "next";
    }
    // 3. Pointing Up (Help) - only index is extended
    else if (indexExtended && middleFolded && ringFolded && pinkyFolded) {
      gestureObj = "help";
    }
    // 4. Thumbs Up and Down
    // All other fingers should be folded.
    else if (indexFolded && middleFolded && ringFolded && pinkyFolded) {
       // Thumbs Up (Yes): Thumb tip is higher (smaller Y) than index knuckle
       if (landmarks[4].y < landmarks[5].y - 0.05) {
         gestureObj = "yes";
       }
       // Thumbs Down (No): Thumb tip is lower (larger Y) than index knuckle
       else if (landmarks[4].y > landmarks[5].y + 0.05) {
         gestureObj = "no";
       }
    }

    if (gestureObj) {
      this.triggerGesture(gestureObj);
    } else {
      // If the hand is visible but not holding a gesture, clear the timeout
      if (this.gestureTimeout) {
        clearTimeout(this.gestureTimeout);
        this.gestureTimeout = null;
      }
    }
  }

  triggerGesture(gesture) {
    // Require holding the gesture for ~500ms
    if (this.lastGesture === gesture) return; 
    
    if (!this.gestureTimeout) {
      this.gestureTimeout = setTimeout(() => {
        this.lastGesture = gesture;
        console.log("🎯 Stable Gesture Detected:", gesture);
        if (this.onGesture) {
          this.onGesture(gesture);
        }
        
        // Reset after 3 seconds allow user to put hand down and avoid spam
        setTimeout(() => { 
          this.lastGesture = null; 
        }, 3000);
      }, 500);
    }
  }
}
