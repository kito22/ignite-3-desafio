import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

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
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  function saveCartInStorage(cart: Product[]){
    localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart))
  }

  const addProduct = async (productId: number) => {
    try {
      
    const productIndex: number = cart.findIndex((product: Product) => product.id === productId)

    
    if(productIndex !== -1){
      if(!(await verifyIfProductHasInStock(productId, cart[productIndex].amount))) {
        return;
      }

      const newCart = cart.map(product => product.id === productId ? {
        ...product,
        amount: product.amount + 1
      } : product)
        
        saveCartInStorage(newCart)
        setCart(newCart)
    } else {

      await verifyIfProductExists(productId)
      
      const { data: dataProduct } = await api.get(`/products/${productId}`)

        const newCart = [...cart, {
          ...dataProduct,
          amount: 1,
        }]

        saveCartInStorage(newCart)
        setCart(newCart)
    }

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = async (productId: number) => {
    try {
      const filteredCart = cart.filter(product => productId !== product.id)

      if(filteredCart.length === cart.length){
        toast.error('Erro na remoção do produto')
        return;
      }

      setCart(filteredCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(filteredCart))

    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const verifyIfProductHasInStock = async (productId: number, amount: number) => {
    const { data } = await api.get(`/stock/${productId}`)
    if(data.amount < Number(amount) + 1 || data.amount === 0){
      toast.error('Quantidade solicitada fora de estoque');
      return false;
    }
    return true
  }

  const verifyIfProductExists = async (productId: number) => {
    try {
      await api.get(`/products/${productId}`)
    } catch {
      toast.error('Produto não existe')
    }
  }


  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const { data } = await api.get(`/stock/${productId}`)
      if(data.amount < amount){
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }
      
      const foundProduct = cart.find(product => product.id === productId);

      if(!foundProduct) {
        toast.error('Erro na alteração de quantidade do produto')
        return;
      }

      

      if(amount < 1){
        return;
      }

      const changedCart = cart.map(product => product.id === productId ? {
        ...product,
        amount: amount,
      } : {
        ...product
      })

      saveCartInStorage(changedCart)
      setCart(changedCart)
     
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
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
