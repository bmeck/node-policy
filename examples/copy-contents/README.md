This example shows replacing the contents of a resource with another resource's contents. In order to see it fail follow the instructions below from this directory:

```console
node-policy integrity:add --policy example-policy.json --algorithm sha512  .

# make a backup so we can roll it back
cp check-auth.js check-auth.js.bak

# make check-auth.js the same as body-parser.js
cp body-parser.js check-auth.js

node --experimental-policy example-policy.json main.js

cp check-auth.js.bak check-auth.js
rm example-policy.json check-auth.js.bak
```
