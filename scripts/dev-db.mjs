// scripts/dev-db.mjs
// este archivo me descarga mongodb manualmente para pruebas rapidas, sin necesidad de crear un contenedor de la app completamente
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { MongoMemoryServer } from "mongodb-memory-server";

const PORT = Number(process.env.DEV_DB_PORT || 27017);
const dbPath = path.join(process.cwd(), ".mongo-dev");
fs.mkdirSync(dbPath, { recursive: true });

function isPortInUse(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: "127.0.0.1" });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
  });
}

if (await isPortInUse(PORT)) {
  console.log(`Ya hay un MongoDB escuchando en el puerto ${PORT}: podés usarlo directamente.`);
  console.log(
    "Si quedó colgado de una ejecución anterior y querés reiniciarlo, cerralo con:\n" +
      (process.platform === "win32"
        ? '  powershell "Get-Process mongod* | Stop-Process"'
        : "  pkill mongod")
  );
  process.exit(0);
}

console.log("Iniciando MongoDB local (la primera vez descarga mongod, puede tardar)...");

const server = await MongoMemoryServer.create({
  instance: { port: PORT, dbPath, storageEngine: "wiredTiger" },
});

console.log(`MongoDB listo en mongodb://127.0.0.1:${PORT}/veklo`);
console.log(`Datos guardados en ${dbPath}. Ctrl+C para detener.`);

async function shutdown() {
  // doCleanup: false para no borrar los datos guardados.
  await server.stop({ doCleanup: false });
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
