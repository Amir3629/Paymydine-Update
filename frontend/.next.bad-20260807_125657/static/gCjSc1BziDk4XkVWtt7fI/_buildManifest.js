self.__BUILD_MANIFEST = {
  "__rewrites": {
    "afterFiles": [
      {
        "source": "/api/v1/:path*"
      },
      {
        "source": "/api/media/:path*"
      },
      {
        "has": [
          {
            "type": "host",
            "value": "(?<tenant>[^.]+)\\.paymydine\\.com"
          }
        ],
        "source": "/:path*",
        "destination": "/:path*"
      },
      {
        "has": [
          {
            "type": "host",
            "value": "localhost:3000"
          }
        ],
        "source": "/:path*",
        "destination": "/:path*"
      },
      {
        "has": [
          {
            "type": "host",
            "value": "localhost:3001"
          }
        ],
        "source": "/:path*",
        "destination": "/:path*"
      }
    ],
    "beforeFiles": [],
    "fallback": []
  },
  "sortedPages": [
    "/_app",
    "/_error"
  ]
};self.__BUILD_MANIFEST_CB && self.__BUILD_MANIFEST_CB()