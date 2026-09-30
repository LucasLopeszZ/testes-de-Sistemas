const { montarAplicacao } = require('./helpers');

let app;
beforeEach(() => {
  jest.useFakeTimers();
  app = montarAplicacao();
  // Isola as funções de negócio dos renderizadores e seus efeitos colaterais.
  for (const name of ['renderClientes', 'renderPets', 'renderProdutos', 'renderCarrinho']) {
    app.window[name] = jest.fn();
  }
});
afterEach(() => {
  app.fechar();
  jest.clearAllTimers();
  jest.useRealTimers();
});

function cliente(nome = 'Ana', email = 'ana@example.com', vip = false) {
  app.preencher('clienteNome', nome);
  app.preencher('clienteEmail', email);
  app.document.getElementById('clienteVip').checked = vip;
  app.window.criarCliente();
}
function pet(nome = 'Rex', tipo = 'cachorro', idade = '3') {
  app.preencher('petNome', nome);
  app.preencher('petTipo', tipo);
  app.preencher('petIdade', idade);
  app.window.cadastrarPet();
}
function produto(nome = 'Ração', preco = '25') {
  app.preencher('produtoNome', nome);
  app.preencher('produtoPreco', preco);
  app.window.criarProduto();
}

describe('Cliente — testes unitários', () => {
  test('01. aceita nome válido', () => {
    cliente();
    expect(app.avaliar('clientes')).toEqual([{ nome: 'Ana', email: 'ana@example.com', vip: false }]);
  });
  test.each(['', '   '])('02. rejeita nome vazio ou em branco: %j', (nome) => {
    cliente(nome);
    expect(app.avaliar('clientes')).toHaveLength(0);
    expect(app.window.alert).toHaveBeenCalled();
  });
  test('03. aceita email válido', () => {
    cliente('Ana', 'ana.silva+pet@example.com.br');
    expect(app.avaliar('clientes[0].email')).toBe('ana.silva+pet@example.com.br');
  });
  test.each(['', 'ana.example.com', 'ana@', '@example.com', 'ana @example.com'])('04. rejeita email inválido: %j', (email) => {
    cliente('Ana', email);
    expect(app.avaliar('clientes')).toHaveLength(0);
    expect(app.window.alert).toHaveBeenCalled();
  });
  test('05. permite marcar cliente VIP', () => {
    cliente('Ana', 'ana@example.com', true);
    expect(app.avaliar('clientes[0].vip')).toBe(true);
  });
});

describe('Pet — testes unitários', () => {
  test('06. cadastra pet', () => {
    pet();
    expect(app.avaliar('pets')).toEqual([{ nome: 'Rex', tipo: 'cachorro', idade: 3 }]);
  });
  test.each(['', '   '])('07. exige nome: %j', (nome) => {
    pet(nome);
    expect(app.avaliar('pets')).toHaveLength(0);
  });
  test.each(['cachorro', 'gato'])('08. aceita tipo %s', (tipo) => {
    pet('Rex', tipo);
    expect(app.avaliar('pets[0].tipo')).toBe(tipo);
  });
  test.each(['', '   '])('08. rejeita tipo ausente: %j', (tipo) => {
    pet('Rex', tipo);
    expect(app.avaliar('pets')).toHaveLength(0);
  });
  test.each(['0', '3'])('09. aceita idade numérica %s', (idade) => {
    pet('Rex', 'cachorro', idade);
    expect(app.avaliar('pets[0].idade')).toBe(Number(idade));
  });
  test.each(['', 'abc', '3anos', '-1', 'Infinity'])('09. rejeita idade inválida: %j', (idade) => {
    pet('Rex', 'cachorro', idade);
    expect(app.avaliar('pets')).toHaveLength(0);
  });
});

describe('Produto — testes unitários', () => {
  test('10. cria produto com nome', () => {
    produto();
    expect(app.avaliar('produtos')).toEqual([{ nome: 'Ração', preco: 25 }]);
  });
  test.each(['', '   '])('10. exige nome: %j', (nome) => {
    produto(nome);
    expect(app.avaliar('produtos')).toHaveLength(0);
  });
  test('11. aceita preço maior que zero', () => {
    produto('Ração', '0.01');
    expect(app.avaliar('produtos[0].preco')).toBe(0.01);
  });
  test.each(['0', '', 'abc', '12abc', 'Infinity'])('11. rejeita preço não positivo ou inválido: %j', (preco) => {
    produto('Ração', preco);
    expect(app.avaliar('produtos')).toHaveLength(0);
  });
  test('12. rejeita preço negativo', () => {
    produto('Ração', '-1');
    expect(app.avaliar('produtos')).toHaveLength(0);
    expect(app.window.alert).toHaveBeenCalled();
  });
});

describe('Carrinho e descontos — testes unitários', () => {
  test('14. adiciona produto ao carrinho', () => {
    app.avaliar('produtos.push({nome: "Ração", preco: 25})');
    app.document.getElementById('produtoSelect').innerHTML = '<option value="0">Ração</option>';
    app.window.adicionarCarrinho();
    expect(app.avaliar('carrinho')).toEqual([{ nome: 'Ração', preco: 25 }]);
  });
  test('15. remove o primeiro produto preservando os demais', () => {
    app.avaliar('carrinho.push({nome: "A", preco: 20}, {nome: "B", preco: 30})');
    app.window.removerCarrinho();
    expect(app.avaliar('carrinho')).toEqual([{ nome: 'B', preco: 30 }]);
  });
  test('17. soma o valor de todos os produtos', () => {
    app.avaliar('carrinho.push({preco: 20}, {preco: 30})');
    expect(Number(app.window.calcularTotal())).toBe(50);
  });
  test.each([[100, 100], [100.10, 90.09], [150, 135]])('18. total de %s resulta em %s', (subtotal, esperado) => {
    app.avaliar(`carrinho.push({preco: ${subtotal}})`);
    expect(Number(app.window.calcularTotal())).toBe(esperado);
  });
  test('19. cliente VIP recebe 15% de desconto', () => {
    // Um único cliente; subtotal abaixo de 100 evita ambiguidade de acumulação.
    cliente('Ana', 'ana@example.com', true);
    app.avaliar('carrinho.push({nome: "Ração", preco: 80})');
    expect(Number(app.window.calcularTotal())).toBe(68);
  });
  test('20. carrinho rejeita produto com preço zero', () => {
    app.avaliar('produtos.push({nome: "Inválido", preco: 0})');
    app.document.getElementById('produtoSelect').innerHTML = '<option value="0">Inválido</option>';
    app.window.adicionarCarrinho();
    expect(app.avaliar('carrinho')).toHaveLength(0);
  });
  test('21. carrinho vazio retorna zero', () => {
    expect(Number(app.window.calcularTotal())).toBe(0);
  });
  test('22. finalizar limpa o carrinho', () => {
    app.avaliar('carrinho.push({nome: "Ração", preco: 25})');
    app.window.finalizarCompra();
    expect(app.avaliar('carrinho')).toHaveLength(0);
    expect(app.window.alert).toHaveBeenCalledWith('Compra finalizada: 25.00');
  });
});
