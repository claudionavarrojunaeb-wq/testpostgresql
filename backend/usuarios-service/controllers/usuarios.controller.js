import { pool } from "../db.js";

export const getUsuarios = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const search = (req.query.search || "").trim();

    const offset = (page - 1) * limit;

    let query = `
      SELECT * FROM usuarios
      WHERE 1=1
    `;

    let countQuery = `
      SELECT COUNT(*) FROM usuarios
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (search) {
      query += `
        AND (
          TRIM(usuariosid) ILIKE $${paramIndex}
          OR TRIM(usuariosnombre) ILIKE $${paramIndex}
          OR TRIM(usuariosemail) ILIKE $${paramIndex}
        )
      `;
      countQuery += `
        AND (
          TRIM(usuariosid) ILIKE $${paramIndex}
          OR TRIM(usuariosnombre) ILIKE $${paramIndex}
          OR TRIM(usuariosemail) ILIKE $${paramIndex}
        )
      `;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY usuariosid LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    const total = await pool.query(countQuery, params.slice(0, paramIndex - 1));

    const cleanData = result.rows.map(u => ({
      id: u.usuariosid?.trim(),
      nombre: u.usuariosnombre?.trim(),
      email: u.usuariosemail?.trim(),
    }));

    res.json({
      data: cleanData,
      total: parseInt(total.rows[0].count),
      page,
      limit
    });

  } catch (error) {
    res.status(500).send("Error en la consulta");
  }
};

export const createUsuario = async (req, res) => {
  const { id, nombre, email } = req.body;

  await pool.query(
    "INSERT INTO usuarios (usuariosid, usuariosnombre, usuariosemail) VALUES ($1,$2,$3)",
    [id, nombre, email]
  );

  res.send("Usuario creado");
};

export const updateUsuario = async (req, res) => {
  const { id } = req.params;
  const { nombre, email } = req.body;

  await pool.query(
    "UPDATE usuarios SET usuariosnombre=$1, usuariosemail=$2 WHERE TRIM(usuariosid)=$3",
    [nombre, email, id.trim()]
  );

  res.send("Usuario actualizado");
};

export const deleteUsuario = async (req, res) => {
  const { id } = req.params;

  await pool.query(
    "DELETE FROM usuarios WHERE usuariosid=$1",
    [id]
  );

  res.send("Usuario eliminado");
};