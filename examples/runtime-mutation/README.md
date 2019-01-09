This example shows runtime mutation of a resource. In order to see it fail follow the instructions below from this directory:

```console
node-policy --policy example-policy.json --algorithm sha512 integrity:add .
node --experimental-policy example-policy.json main.js
```

This kind of manipulation was seen in the [event-stream incident](https://snyk.io/blog/a-post-mortem-of-the-malicious-event-stream-backdoor/).
