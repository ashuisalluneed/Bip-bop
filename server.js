const { createServer } = require("http");
const { parse } = require("url");
const Next = require("next");
const next = Next.default || Next;

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

// Initialize Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
    // Create native HTTP server
    const server = createServer((req, res) => {
        try {
            const parsedUrl = parse(req.url || "/", true);
            handle(req, res, parsedUrl);
        } catch (err) {
            console.error("Error occurred handling", req.url, err);
            res.statusCode = 500;
            res.end("internal server error");
        }
    });

    // We can't immediately run the TS import inside a strict JS require environment.
    // Instead of importing the whole custom gateway, we'll try a dynamic import 
    // or register ts-node.
    require('ts-node').register({
        transpileOnly: true,
        compilerOptions: { module: 'commonjs' }
    });

    const { createAuroraGateway } = require("./src/server/ws/gateway");

    // Attach the Aurora WebSocket Gateway to the HTTP server
    // This allows ws://localhost:3000 to connect directly to our Node process
    createAuroraGateway(server);

    server
        .once("error", (err) => {
            console.error(err);
            process.exit(1);
        })
        .listen(port, () => {
            console.log(`> Ready on http://${hostname}:${port}`);
            console.log(`> Aurora WS attached at ws://${hostname}:${port}`);
        });
});
