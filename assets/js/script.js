Chart.register(ChartDataLabels);
let grafico = null;
let todasTarefas = [];

function removerAcentos(texto) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

async function carregarTarefas() {
  const resposta = await fetch("https://sheetdb.io/api/v1/bglmy3f5fbzqv");
  todasTarefas = await resposta.json();
  renderTarefas("todos");
}

function renderTarefas(filtro) {
  const tbody = document.getElementById("tabela-tarefas");
  tbody.innerHTML = "";

  const tarefasFiltradas = todasTarefas.filter(t => {
    const status = removerAcentos(t.Status);
    if (filtro === "pendente") return status === "pendente";
    if (filtro === "concluido") return status === "concluido";
    if (filtro === "emProgresso") return ["em pausa", "em refatoracao", "em aprovacao"].includes(status);
    return true;
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

  // Atualiza os contadores
  document.querySelector(".box.vermelho").textContent = contagem["pendente"];
  document.querySelector(".box.amarelo").textContent =
    contagem["em refatoracao"] +
    contagem["em aprovacao"] +
    contagem["em pausa"];
  document.querySelector(".box.verde").textContent = contagem["concluido"];
  document.querySelector(".total-tarefas").textContent = "Total de Tarefas: " + tarefasFiltradas.length;

  atualizarGrafico(contagem);
}

function atualizarGrafico(contagem) {
  const ctx = document.getElementById("graficoStatus").getContext("2d");
  if (grafico) grafico.destroy();

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
          color: '#333',
          font: { weight: 'bold', size: 14 },
          formatter: value => value > 0 ? value : ''
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1 },
          grid: { color: "rgba(0, 0, 0, 0.05)" }
        },
        x: {
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
    btn.addEventListener("click", () =>
      renderTarefas(btn.dataset.status)
    )
  );

  document.getElementById("limparFiltro")
    .addEventListener("click", () => renderTarefas("todos"));
});
