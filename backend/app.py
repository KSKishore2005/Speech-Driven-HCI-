# =============================================================
# app.py — Flask Application Bootstrap
# Smart Learning Assistant Backend
# =============================================================

import os
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

# Load .env file
load_dotenv()


def create_app() -> Flask:
    app = Flask(__name__)

    # ── CORS — allow frontend on port 5500 ───────────────────
    CORS(app, resources={
        r"/*": {
            "origins": [
                "http://localhost:5500",
                "http://127.0.0.1:5500",
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "null",   # for file:// protocol during development
            ],
            "methods": ["GET", "POST", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
        }
    })

    # ── Register routes ───────────────────────────────────────
    from routes.api import api
    app.register_blueprint(api)

    # ── Global error handlers ─────────────────────────────────
    @app.errorhandler(404)
    def not_found(e):
        return {"error": "Endpoint not found", "status": "error"}, 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return {"error": "Method not allowed", "status": "error"}, 405

    @app.errorhandler(500)
    def internal_error(e):
        return {"error": "Internal server error", "status": "error"}, 500

    return app


if __name__ == "__main__":
    app = create_app()
    port = int(os.getenv("FLASK_PORT", 5000))
    debug = os.getenv("FLASK_ENV", "development") == "development"
    print(f"\n Smart Learning Assistant Backend (Groq-Powered)")
    print(f"   Running at: http://localhost:{port}")
    print(f"   Groq API key: {' Set' if os.getenv('GROQ_API_KEY') and not os.getenv('GROQ_API_KEY', '').startswith('gsk-your') else '❌ Not set (add to .env)'}")
    print(f"   Mode: {'Development' if debug else 'Production'}\n")
    app.run(host="0.0.0.0", port=port, debug=debug)
