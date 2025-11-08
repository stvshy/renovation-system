// G:\renovation-system\frontend\src\App.tsx
import { useState, useEffect } from "react";
import supabase from "./utils/supabase"; // Poprawny import, jeśli export default

interface Todo {
  id: number;
  task: string; // Zakładamy, że masz kolumnę 'task'
  // Dodaj inne właściwości, jeśli Twoja tabela 'todos' je posiada
}

function App() {
  // Zmieniłem nazwę funkcji z Page na App
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function getTodos() {
      // Funkcja musi być async, aby użyć await
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase.from("todos").select("*"); // Zamiast select(), użyj select('*') lub konkretnych kolumn

        if (error) {
          throw error;
        }

        if (data) {
          setTodos(data);
        }
      } catch (err: any) {
        setError(err.message);
        console.error("Błąd podczas pobierania zadań:", err);
      } finally {
        setLoading(false);
      }
    }

    getTodos();
  }, []); // Pusta tablica zależności, aby efekt uruchomił się tylko raz po zamontowaniu

  if (loading) return <div>Ładowanie zadań...</div>;
  if (error) return <div>Błąd: {error}</div>;

  return (
    <div>
      <h1>Lista zadań (Todos)</h1>
      {todos.length === 0 ? (
        <p>Brak zadań. Dodaj coś w Supabase!</p>
      ) : (
        <ul>
          {todos.map((todo) => (
            <li key={todo.id}>{todo.task}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default App; // Zmieniono na App
