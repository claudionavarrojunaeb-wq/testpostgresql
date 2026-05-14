import express from 'express';
import usuariosRoutes from './routes/usuarios.routes.js';
import cors from 'cors';
const app = express();
app.use(express.json());
app.use(cors()); // 👈 ESTA LÍNEA ES CLAVE
app.use('/usuarios', usuariosRoutes);

app.listen(3001, () => {
  console.log('Usuarios service corriendo en 3001');
});