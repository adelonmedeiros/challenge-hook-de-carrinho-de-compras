import { totalmem } from "node:os";
import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart"); // recuperando dados da API localStorage

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart]; // criando um array a partir do valor que já tenho no carrinho ( CRIADO ESSE NOVO ARRAY PARA NÃO COMPROMETER O ARRAY DO JÁ EXISTENTE DO CART)

      const productExists = updatedCart.find(
        (product) => product.id === productId
      ); // procurando através do find dentro do array updatedCart se o id desse produto é igual o id que recebo na função. Se não for igual o produto não exite no carrinho

      const stock = await api.get(`/stock/${productId}`); // pegando o valor do Stock

      const stockAmount = stock.data.amount; // váriavel que verifica a quantidade de produtos no stock

      const currentAmount = productExists ? productExists.amount : 0; // criada váriavel currentAmount (quantidade atual) que faz a seguinte checagem: se o produto existir pego a quantidade dele se não ele é zero.

      const amount = currentAmount + 1; //váriavel amount (quantidade "desejada") que é a quantidade atual mais 1.

      // agora iremos realizar a verificação

      // se a quantidade desejada for maior que a quantidade em stock exibir mensagem de erro
      if (amount > stockAmount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      // se o produto existe, irá atualizar atualizar a quantidade de produtos
      if (productExists) {
        productExists.amount = amount;
      } else {
        // se ele não existe, adicionar produto ao carrinho
        const product = await api.get(`/products/${productId}`); // caso for um produto novo

        const newProduct = {
          ...product.data,
          amount: 1,
        };
        updatedCart.push(newProduct);
      }

      setCart(updatedCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart)); //transformando array do updatedCart em string com o stringify
    } catch {
      toast.error("Erro na adição do produto"); // método que exibe o erro
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productIndex = updatedCart.findIndex(
        (product) => product.id === productId
      ); //utilizamos o findIndex pq com ele é possível utilizar o Splice para remover do array

      if (productIndex >= 0) {
        // (quando o index não encontra retorna -1) se ele encontrou
        updatedCart.splice(productIndex, 1);
        setCart(updatedCart);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart)); // enviando pro localStorage
      } else {
        // se ele não encontrou
        throw Error(); // forçando o erro para ir para o catch e mostrar a mensagem
      }
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const stock = await api.get(`/stock/${productId}`);

      const stockAmount = stock.data.amount;

      if (amount > stockAmount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const updatedCart = [...cart];
      const productExists = updatedCart.find(
        (product) => product.id === productId
      );

      if (productExists) {
        productExists.amount = amount;
        setCart(updatedCart);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
      } else {
        throw Error();
      }
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
