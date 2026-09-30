const { montarAplicacao } = require('./helpers');
let app;
beforeEach(() => {
  jest.useFakeTimers();
  app = montarAplicacao();
});
afterEach(() => {
  app.fechar();
  jest.clearAllTimers();
  jest.useRealTimers();
});
function cadastrarProduto(nome, preco) {
  app.preencher('produtoNome', nome);
  app.preencher('produtoPreco', preco);
  app.clicar('criarProduto');
}
function itens(id) {
  // A aplicação utiliza innerText; lê a mesma propriedade no DOM simulado.
  return Array.from(app.document.querySelectorAll(`#${id} li`), (li) => li.innerText);
}

test('01–05. formulário cadastra cliente VIP e atualiza lista', () => {
  app.preencher('clienteNome', 'Ana');
  app.preencher('clienteEmail', 'ana@example.com');
  app.document.getElementById('clienteVip').click();
  app.clicar('criarCliente');
  expect(itens('listaClientes')).toEqual(['Ana - ana@example.com']);
  expect(app.avaliar('clientes[0].vip')).toBe(true);
});
test('06–09. formulário cadastra pet e atualiza lista', () => {
  app.preencher('petNome', 'Rex');
  app.preencher('petTipo', 'cachorro');
  app.preencher('petIdade', '3');
  app.clicar('cadastrarPet');
  expect(itens('listaPets')).toEqual(['Rex (cachorro)']);
  expect(app.avaliar('pets[0].idade')).toBe(3);
});
test('13. produto aparece na lista e na seleção do carrinho', () => {
  cadastrarProduto('Ração', '25');
  expect(itens('listaProdutos')).toEqual(['Ração - R$ 25']);
  const option = app.document.querySelector('#produtoSelect option');
  expect(option.innerText).toBe('Ração');
  expect(option.value).toBe('0');
});
test('14, 16, 17. lista todos os produtos adicionados e exibe a soma', () => {
  cadastrarProduto('Ração', '25');
  cadastrarProduto('Brinquedo', '15');
  app.preencher('produtoSelect', '0');
  app.clicar('adicionarCarrinho');
  app.preencher('produtoSelect', '1');
  app.clicar('adicionarCarrinho');
  expect(itens('listaCarrinho')).toEqual(['Ração - 25', 'Brinquedo - 15']);
  expect(app.document.getElementById('total').innerText).toBe('40.00');
});
test('18. compra acima de 100 exibe desconto de 10%', () => {
  cadastrarProduto('Ração', '120');
  app.clicar('adicionarCarrinho');
  expect(app.document.getElementById('total').innerText).toBe('108.00');
});
test('19. compra do único cliente VIP exibe desconto de 15%', () => {
  app.preencher('clienteNome', 'Ana');
  app.preencher('clienteEmail', 'ana@example.com');
  app.document.getElementById('clienteVip').click();
  app.clicar('criarCliente');
  cadastrarProduto('Ração', '80');
  app.clicar('adicionarCarrinho');
  expect(app.document.getElementById('total').innerText).toBe('68.00');
});
test('23. carrossel muda a cada 4 segundos e retorna ao início', () => {
  const slides = app.document.querySelector('.slides');
  jest.advanceTimersByTime(3999);
  expect(slides.style.transform).toBe('');
  jest.advanceTimersByTime(1);
  expect(slides.style.transform).toBe('translateX(-100%)');
  jest.advanceTimersByTime(4000);
  expect(slides.style.transform).toBe('translateX(-200%)');
  jest.advanceTimersByTime(4000);
  expect(slides.style.transform).toBe('translateX(-0%)');
});
test('15, 21, 22, 24. botões adicionar, remover e finalizar atualizam estado e tela', () => {
  cadastrarProduto('Ração', '25');
  app.clicar('adicionarCarrinho');
  expect(itens('listaCarrinho')).toEqual(['Ração - 25']);
  app.clicar('removerCarrinho');
  expect(itens('listaCarrinho')).toEqual([]);
  expect(app.document.getElementById('total').innerText).toBe('0.00');
  app.clicar('adicionarCarrinho');
  app.clicar('finalizarCompra');
  expect(app.window.alert).toHaveBeenCalledWith('Compra finalizada: 25.00');
  expect(app.avaliar('carrinho')).toHaveLength(0);
  expect(itens('listaCarrinho')).toEqual([]);
  expect(app.document.getElementById('total').innerText).toBe('0.00');
});
