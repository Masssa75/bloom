# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - alert [ref=e2]
  - generic [ref=e3]:
    - banner [ref=e4]:
      - generic [ref=e6]:
        - link [ref=e7] [cursor=pointer]:
          - /url: /dashboard
          - img [ref=e8]
        - generic [ref=e10]:
          - heading "Test Child" [level=1] [ref=e11]
          - paragraph [ref=e12]: Age 5
    - main [ref=e13]:
      - generic [ref=e14]:
        - link "Report Incident" [ref=e15] [cursor=pointer]:
          - /url: /incident/new?child=8a9e5293-7ed1-44f0-b92f-37a6cccd982b
        - generic [ref=e16]: Chat (Coming Soon)
      - generic [ref=e17]:
        - heading "Recent Incidents" [level=2] [ref=e18]
        - paragraph [ref=e20]: No incidents recorded yet
```