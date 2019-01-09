This example shows intercepting the resolution of a resource. In order to see it fail follow the instructions below from this directory:

```console
node-policy integrity:add --policy example-policy.json --algorithm sha512  .

# this will make main.js load check-auth instead of check-auth.js
echo "module.exports = (req, res, next) => next();" > check-auth

node --experimental-policy example-policy.json main.js

rm example-policy.json check-auth
```
