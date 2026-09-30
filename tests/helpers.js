const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const source = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');

function montarAplicacao() {
  // Executa apenas arquivos locais confiáveis; não carrega imagens ou scripts remotos.
  const dom = new JSDOM(html, { runScripts: 'dangerously' });
  const { window } = dom;
  window.alert = jest.fn();
  // Encaminha o intervalo para o relógio controlado pelo Jest.
  window.setInterval = setInterval;
  window.eval(`${source}\nwindow.__avaliarEstado = (code) => eval(code);`);
  return {
    window,
    document: window.document,
    avaliar: (code) => window.__avaliarEstado(code),
    preencher(id, value) { window.document.getElementById(id).value = value; },
    clicar(handler) {
      const button = window.document.querySelector(`button[onclick="${handler}()"]`);
      if (!button) throw new Error(`Botão não encontrado: ${handler}`);
      button.click();
    },
    fechar() { dom.window.close(); },
  };
}

module.exports = { montarAplicacao };
