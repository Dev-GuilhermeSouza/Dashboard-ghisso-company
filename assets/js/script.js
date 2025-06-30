Chart.register(ChartDataLabels);
let grafico = null;
let todasTarefas = [];
let ultimoFiltro = "todos";
let ultimaContagem = {};
let ordemAtual = { coluna: null, crescente: true };

function removerAcentos(texto) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function parseDataBR(dataStr) {
  const [dia, mes, ano] = dataStr.split("/");
  return new Date(`${ano}-${mes}-${dia}`);
}

async function carregarTarefas() {
  const resposta = await fetch("https://sheetdb.io/api/v1/bglmy3f5fbzqv");
  todasTarefas = await resposta.json();
  renderTarefas("todos");
}

function renderTarefas(filtro) {
  const tbody = document.getElementById("tabela-tarefas");
  const termoBusca = document.getElementById("campoBusca")?.value?.toLowerCase().trim() || "";
  tbody.innerHTML = "";

  const tarefasFiltradas = todasTarefas.filter(t => {
    const status = removerAcentos(t.Status);
    const nome = t.Tarefa?.toLowerCase() || "";

    const statusOk =
      filtro === "pendente" ? status === "pendente" :
      filtro === "concluido" ? status === "concluido" :
      filtro === "emProgresso" ? ["em pausa", "em refatoracao", "em aprovacao"].includes(status) :
      true;

    const buscaOk = nome.includes(termoBusca);
    return statusOk && buscaOk;
  });

  const contagem = {
    "concluido": 0,
    "pendente": 0,
    "em pausa": 0,
    "em refatoracao": 0,
    "em aprovacao": 0
  };

  tarefasFiltradas.forEach(t => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${t.Tarefa}</td>
      <td>${t["Data de Início"]}</td>
      <td>${t["Data de Término"]}</td>
      <td>${t.Status}</td>
    `;
    tbody.appendChild(tr);

    const status = removerAcentos(t.Status);
    if (contagem[status] !== undefined) contagem[status]++;
  });

  ultimaContagem = contagem;

  document.querySelector(".box.vermelho").textContent = contagem["pendente"];
  document.querySelector(".box.amarelo").textContent =
    contagem["em refatoracao"] + contagem["em aprovacao"] + contagem["em pausa"];
  document.querySelector(".box.verde").textContent = contagem["concluido"];
  document.querySelector(".total-tarefas").textContent = "Total de Tarefas: " + tarefasFiltradas.length;

  atualizarGrafico(contagem);
}

function atualizarGrafico(contagem) {
  const ctx = document.getElementById("graficoStatus").getContext("2d");
  if (grafico) grafico.destroy();

  const isDark = document.body.classList.contains("dark");

  grafico = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ["Concluído", "Pendente", "Em Pausa", "Em Refatoração", "Em Aprovação"],
      datasets: [{
        label: "Status das Tarefas",
        data: [
          contagem["concluido"],
          contagem["pendente"],
          contagem["em pausa"],
          contagem["em refatoracao"],
          contagem["em aprovacao"]
        ],
        backgroundColor: ["#4caf50", "#f44336", "#9e9e9e", "#ffc107", "#2196f3"],
        borderRadius: 10,
        barPercentage: 0.6
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        datalabels: {
          anchor: 'end',
          align: 'start',
          color: isDark ? '#eee' : '#333',
          font: { weight: 'bold', size: 14 },
          formatter: value => value > 0 ? value : ''
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1, color: isDark ? '#ccc' : '#333' },
          grid: { color: isDark ? '#444' : "rgba(0, 0, 0, 0.05)" }
        },
        x: {
          ticks: { color: isDark ? '#ccc' : '#333' },
          grid: { display: false }
        }
      }
    },
    plugins: [ChartDataLabels]
  });
}

document.addEventListener("DOMContentLoaded", () => {
  carregarTarefas();

  document.querySelectorAll(".filtro").forEach(btn =>
    btn.addEventListener("click", () => {
      ultimoFiltro = btn.dataset.status;
      renderTarefas(ultimoFiltro);
    })
  );

  document.getElementById("limparFiltro")
    .addEventListener("click", () => {
      ultimoFiltro = "todos";
      renderTarefas(ultimoFiltro);
    });

  document.getElementById("campoBusca")
    .addEventListener("input", () => renderTarefas(ultimoFiltro));

  // Dark mode toggle
  const toggleBtn = document.getElementById("toggleDarkMode");
  const body = document.body;
  const icon = toggleBtn.querySelector("i");

  if (localStorage.getItem("modo") === "dark") {
    body.classList.add("dark");
    icon.classList.replace("fa-moon", "fa-sun");
  }

  toggleBtn.addEventListener("click", () => {
    body.classList.toggle("dark");
    const darkAtivo = body.classList.contains("dark");
    icon.classList.toggle("fa-moon", !darkAtivo);
    icon.classList.toggle("fa-sun", darkAtivo);
    localStorage.setItem("modo", darkAtivo ? "dark" : "light");
    atualizarGrafico(ultimaContagem);
  });

  // Ordenação com setinhas visuais
  const ths = document.querySelectorAll("th");
  const chaves = ["Tarefa", "Data de Início", "Data de Término", "Status"];

  ths.forEach((th, index) => {
    th.style.cursor = "pointer";

    const seta = document.createElement("span");
    seta.classList.add("seta");
    seta.style.marginLeft = "6px";
    th.appendChild(seta);

    th.addEventListener("click", () => {
      const crescente = ordemAtual.coluna === index ? !ordemAtual.crescente : true;
      ordemAtual = { coluna: index, crescente };

      ths.forEach((outro, i) => {
        const icone = outro.querySelector(".seta");
        if (icone) icone.textContent = i === index ? (crescente ? "↑" : "↓") : "";
      });

      const chave = chaves[index];

      todasTarefas.sort((a, b) => {
        const valA = a[chave] || "";
        const valB = b[chave] || "";

        const isData = chave.includes("Data");
        const dataA = isData ? parseDataBR(valA) : valA;
        const dataB = isData ? parseDataBR(valB) : valB;

        if (isData) {
          return crescente ? dataA - dataB : dataB - dataA;
        }

        return crescente
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      });

      renderTarefas(ultimoFiltro);
    });
  });
});
