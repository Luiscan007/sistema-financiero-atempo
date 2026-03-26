const analizarDocumento = useCallback(async (file: File) => {
    setAnalizando(true);
    setErrMsg('');

    try {
      if (file.type === 'application/pdf') {
        throw new Error("El modelo visual no lee PDFs. Por favor, sube una captura de pantalla (JPG/PNG).");
      }

      const base64: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          const res = reader.result as string;
          resolve(res.split(',')[1]);
        };
        reader.onerror = error => reject(error);
      });

      const res = await fetch('/api/chat-agente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: `Actúa como un sistema contable automatizado. Extrae los datos de esta imagen y devuelve ÚNICAMENTE un objeto JSON válido, sin texto adicional ni formato markdown:
          {
            "banco": "nombre",
            "cuenta": "numero",
            "periodo": "rango fechas",
            "saldoInicial": 0,
            "saldoFinal": 0,
            "movimientos": [
              {"fecha": "YYYY-MM-DD", "descripcion": "texto", "referencia": "texto", "debito": 0, "credito": 0}
            ]
          }`,
          messages: [{ role: 'user', content: "Genera el JSON con los movimientos de este estado de cuenta." }],
          imageBase64: base64,
          imageMime: file.type
        }),
      });

      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || `Error del servidor HTTP ${res.status}`);
      if (data.error) throw new Error(data.error);

      let parsed;
      try {
        parsed = JSON.parse(data.text);
      } catch (parseError) {
        // Ahora sí te escupirá la respuesta COMPLETA si no es un JSON
        throw new Error(`Basura en el JSON: ${data.text}`);
      }
      
      const movsFormateados = (parsed.movimientos || []).map((m: any, i: number) => ({
        id: `banco-${i}-${Date.now()}`,
        fecha: m.fecha,
        descripcion: m.descripcion,
        referencia: m.referencia,
        monto: m.credito > 0 ? m.credito : m.debito,
        tipo: m.credito > 0 ? 'credito' : 'debito',
        fuente: 'banco'
      }));

      setMovsBanco(movsFormateados);
      setInfoBanco(parsed);
      setPaso('revisar_banco');
    } catch (err: any) {
      console.error("Error detallado:", err);
      setErrMsg(`Fallo técnico: ${err.message}`);
    } finally {
      setAnalizando(false);
    }
  }, []);
