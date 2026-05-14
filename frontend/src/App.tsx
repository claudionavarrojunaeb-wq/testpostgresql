import { useEffect, useRef, useState } from 'react';
import Login from './login';

type Usuario = {
  id: string;
  nombre: string;
  email: string;
};

type CacheItem = {
  data: Usuario[];
  total: number;
};

function App() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [form, setForm] = useState<Usuario>({ id: '', nombre: '', email: '' });
  const [editando, setEditando] = useState(false);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 15;

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const [sortField, setSortField] = useState<'id' | 'nombre' | 'email'>('id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [isAuth, setIsAuth] = useState(!!localStorage.getItem('token'));

  // 🔥 cache simple
  const cacheRef = useRef<Record<string, CacheItem>>({});

  // 🔎 debounce
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // 🔹 fetch PRO
  useEffect(() => {
    if (!isAuth) return;

    const controller = new AbortController();

    const key = `${page}-${debouncedSearch}-${sortField}-${sortOrder}`;

    const fetchData = async () => {
      const token = localStorage.getItem('token');

      // 🔥 cache hit
      if (cacheRef.current[key]) {
        const cached = cacheRef.current[key];
        setUsuarios(cached.data);
        setTotal(cached.total);
        return;
      }

      setLoading(true);

      try {
        const res = await fetch(
          `http://localhost:3001/usuarios?page=${page}&limit=${limit}&search=${debouncedSearch}`,
          {
            headers: { Authorization: `Bearer ${token || ''}` },
            signal: controller.signal
          }
        );

        if (res.status === 401) {
          localStorage.removeItem('token');
          setIsAuth(false);
          return;
        }

        const data = await res.json();

        let lista = data.data;

        lista = lista.sort((a: Usuario, b: Usuario) => {
          const valA = a[sortField].toLowerCase();
          const valB = b[sortField].toLowerCase();

          if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
          if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
          return 0;
        });

        setUsuarios(lista);
        setTotal(data.total);

        // 🔥 guardar en cache
        cacheRef.current[key] = {
          data: lista,
          total: data.total
        };

      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error(err.message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => controller.abort(); // 🔥 cancela request anterior

  }, [page, debouncedSearch, sortField, sortOrder, isAuth]);

  // 🔹 CRUD
  const guardarUsuario = async () => {
    const token = localStorage.getItem('token');

    await fetch(`http://localhost:3001/usuarios${editando ? '/' + form.id : ''}`, {
      method: editando ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}` },
      body: JSON.stringify(form),
    });

    cacheRef.current = {}; // 🔥 limpiar cache
    setForm({ id: '', nombre: '', email: '' });
    setEditando(false);
    setPage(1);
  };

  const eliminarUsuario = async (id: string) => {
    const token = localStorage.getItem('token');

    await fetch(`http://localhost:3001/usuarios/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token || ''}` }
    });

    cacheRef.current = {}; // 🔥 limpiar cache
    setPage(1);
  };

  const editarUsuario = (u: Usuario) => {
    setForm(u);
    setEditando(true);
  };

  const ordenar = (campo: 'id' | 'nombre' | 'email') => {
    if (sortField === campo) {
      setSortOrder(o => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(campo);
      setSortOrder('asc');
    }
  };

  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  const getPaginas = () => {
    const max = 10;
    let s = Math.max(page - 5, 1);
    let e = s + max - 1;

    if (e > totalPages) {
      e = totalPages;
      s = Math.max(e - max + 1, 1);
    }

    const pages: (number | string)[] = [];

    if (s > 1) {
      pages.push(1);
      if (s > 2) pages.push('...');
    }

    for (let i = s; i <= e; i++) pages.push(i);

    if (e < totalPages) {
      if (e < totalPages - 1) pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  };

  const paginas = getPaginas();

  // 🔐 login
  if (!isAuth) {
    return <Login onLogin={() => setIsAuth(true)} />;
  }

  return (
    <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'Arial' }}>
      <h1>CRUD Usuarios</h1>

      <button
        onClick={() => {
          localStorage.removeItem('token');
          setIsAuth(false);
        }}
        style={{ position: 'absolute', top: 10, right: 10 }}
      >
        Logout
      </button>

      <input
        placeholder="Buscar usuario..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      <div>
        Mostrando {total === 0 ? 0 : start} - {end} de {total}
      </div>

      {/* FORM */}
      <div>
        <input value={form.id} onChange={e => setForm({ ...form, id: e.target.value })} disabled={editando} />
        <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
        <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        <button onClick={guardarUsuario}>
          {editando ? 'Actualizar' : 'Crear'}
        </button>
      </div>

      {/* TABLA */}
      <table style={{ margin: '20px auto', width: '80%', background: '#1e1e1e', color: 'white' }}>
        <thead>
          <tr>
            <th onClick={() => ordenar('id')}>ID</th>
            <th onClick={() => ordenar('nombre')}>Nombre</th>
            <th onClick={() => ordenar('email')}>Email</th>
            <th>Acciones</th>
          </tr>
        </thead>

        <tbody>
          {loading ? (
            // 🔥 skeleton
            [...Array(limit)].map((_, i) => (
              <tr key={i}>
                <td colSpan={4}>Cargando...</td>
              </tr>
            ))
          ) : usuarios.length === 0 ? (
            <tr><td colSpan={4}>Sin resultados</td></tr>
          ) : (
            usuarios.map(u => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.nombre}</td>
                <td>{u.email}</td>
                <td>
                  <button onClick={() => editarUsuario(u)}>Editar</button>
                  <button onClick={() => eliminarUsuario(u.id)}>Eliminar</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* PAGINACIÓN */}
      <div>
        <button onClick={() => setPage(1)}>⏮</button>
        <button onClick={() => setPage(p => Math.max(p - 1, 1))}>◀</button>

        {paginas.map((p, i) =>
          p === '...' ? (
            <span key={i}>...</span>
          ) : (
            <button
              key={i}
              onClick={() => setPage(Number(p))}
              style={{
                background: Number(p) === page ? '#4CAF50' : '#555',
                color: 'white'
              }}
            >
              {p}
            </button>
          )
        )}

        <button onClick={() => setPage(p => Math.min(p + 1, totalPages))}>▶</button>
        <button onClick={() => setPage(totalPages)}>⏭</button>
      </div>
    </div>
  );
}

export default App;