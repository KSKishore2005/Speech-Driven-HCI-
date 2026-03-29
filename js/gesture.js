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

    // --- ROBUST DISTANCE-BASED GESTURE MATH ---
    // A finger is extended if its TIP is physically further from the WRIST than its PIP joint, regardless of hand rotation.
    const getDst = (idxA, idxB) => Math.hypot(landmarks[idxA].x - landmarks[idxB].x, landmarks[idxA].y - landmarks[idxB].y);
    const isExtended = (tip, pip) => getDst(0, tip) > getDst(0, pip) + 0.01;

    const indexExtended  = isExtended(8, 6);
    const middleExtended = isExtended(12, 10);
    const ringExtended   = isExtended(16, 14);
    const pinkyExtended  = isExtended(20, 18);

    const indexFolded  = !indexExtended;
    const middleFolded = !middleExtended;
    const ringFolded   = !ringExtended;
    const pinkyFolded  = !pinkyExtended;

    // Thumb check: evaluate thumb extending OUTWARD from palm.
    // Thumb is open if tip(4) is further away from the pinky base(17) than the Thumb base(2) is.
    const thumbExtended = getDst(17, 4) > getDst(17, 2) + 0.05;

    let gestureObj = null;

    // 1. Open Palm (Stop)
    // 4 major fingers definitely extended
    if (indexExtended && middleExtended && ringExtended && pinkyExtended) {
      gestureObj = "stop"; 
    }
    // 2. Peace Sign (Next / Quiz Me)
    else if (indexExtended && middleExtended && ringFolded && pinkyFolded && !thumbExtended) {
      gestureObj = "next";
    }
    // 3. Pointing Up (Help)
    else if (indexExtended && middleFolded && ringFolded && pinkyFolded && !thumbExtended) {
      gestureObj = "help";
    }
    // 4. Thumbs Up and Down
    // Fingers strictly folded, thumb strictly extended outward
    else if (indexFolded && middleFolded && ringFolded && pinkyFolded && thumbExtended) {
       // Orientation check for thumb
       if (landmarks[4].y < landmarks[5].y - 0.03) {
         gestureObj = "yes"; // Thumb tip above index knuckle
       }
       else if (landmarks[4].y > landmarks[5].y + 0.03) {
         gestureObj = "no"; // Thumb tip below index knuckle
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
