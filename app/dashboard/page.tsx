"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, collection, addDoc, query, where, onSnapshot } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function DashboardPage() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [store, setStore] = useState<any>(null);
    const [storeName, setStoreName] = useState("");
    const [saving, setSaving] = useState(false);

    const [products, setProducts] = useState<any[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newProduct, setNewProduct] = useState({ name: "", price: "", description: "" });
    const [imageFile, setImageFile] = useState<File | null>(null);

    const router = useRouter();

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                router.push("/");
                return;
            }
            setUser(currentUser);

            const storeRef = doc(db, "stores", currentUser.uid);
            const storeSnap = await getDoc(storeRef);

            if (storeSnap.exists()) {
                setStore(storeSnap.data());

                const q = query(collection(db, "products"), where("storeId", "==", currentUser.uid));
                const unsubscribeProducts = onSnapshot(q, (snapshot) => {
                    const productsArray = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setProducts(productsArray);
                });

                setLoading(false);
                return () => unsubscribeProducts();
            }
            setLoading(false);
        });

        return () => unsubscribeAuth();
    }, [router]);

    const handleLogout = async () => {
        await signOut(auth);
        router.push("/");
    };

    const handleCreateStore = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!storeName.trim() || !user) return;

        setSaving(true);
        try {
            const slug = storeName.toLowerCase().replace(/\s+/g, '-');
            const storeData = { name: storeName, slug: slug, ownerId: user.uid, createdAt: new Date().toISOString() };
            await setDoc(doc(db, "stores", user.uid), storeData);
            setStore(storeData);
        } catch (error: any) {
            alert("Error al crear la tienda: " + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleAddProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newProduct.name || !newProduct.price) return;

        setSaving(true);
        try {
            let imageUrl = "";

            if (imageFile) {
                const imageRef = ref(storage, `products/${user.uid}/${Date.now()}_${imageFile.name}`);
                const uploadResult = await uploadBytes(imageRef, imageFile);
                imageUrl = await getDownloadURL(uploadResult.ref);
            }

            await addDoc(collection(db, "products"), {
                ...newProduct,
                price: parseFloat(newProduct.price),
                storeId: user.uid,
                imageUrl: imageUrl,
                createdAt: new Date().toISOString()
            });

            setIsDialogOpen(false);
            setNewProduct({ name: "", price: "", description: "" });
            setImageFile(null);
        } catch (error: any) {
            alert("Error al guardar el producto: " + error.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex h-screen items-center justify-center">Cargando tu panel...</div>;

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8">
            <div className="flex justify-between items-center border-b pb-4">
                <h1 className="text-3xl font-bold">Panel de Control</h1>
                <Button onClick={handleLogout} variant="destructive">Cerrar sesión</Button>
            </div>

            {!store ? (
                <div className="p-6 border rounded-lg bg-zinc-50 dark:bg-zinc-900 max-w-md mx-auto mt-10">
                    <h2 className="text-xl font-semibold mb-2">Configura tu Negocio</h2>
                    <form onSubmit={handleCreateStore} className="space-y-4">
                        <Input placeholder="Ej: Burger House" value={storeName} onChange={(e) => setStoreName(e.target.value)} disabled={saving} />
                        <Button type="submit" className="w-full" disabled={saving || !storeName}>{saving ? "Guardando..." : "Crear mi restaurante"}</Button>
                    </form>
                </div>
            ) : (
                <div className="space-y-8">
                    <div className="p-6 border rounded-lg flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-semibold text-blue-600">{store.name}</h2>
                            <p className="text-sm text-zinc-500 mt-1">Enlace público: ordena.com/{store.slug}</p>
                        </div>

                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button>+ Agregar Producto</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Añadir plato al menú</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleAddProduct} className="space-y-4 mt-4">
                                    <div>
                                        <label className="text-sm font-medium">Foto del plato</label>
                                        <Input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                if (e.target.files && e.target.files[0]) {
                                                    setImageFile(e.target.files[0]);
                                                }
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">Nombre del plato</label>
                                        <Input placeholder="Ej: Maki Acevichado..." value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} required />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">Descripción corta</label>
                                        <Input placeholder="Ej: Relleno de langostino..." value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">Precio (S/)</label>
                                        <Input type="number" step="0.10" placeholder="Ej: 25.00" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} required />
                                    </div>
                                    <Button type="submit" className="w-full" disabled={saving}>
                                        {saving ? "Subiendo foto y guardando..." : "Guardar Producto"}
                                    </Button>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <div>
                        <h3 className="text-xl font-semibold mb-4">Tu Menú</h3>
                        {products.length === 0 ? (
                            <div className="p-8 border border-dashed rounded-lg text-center text-zinc-500">
                                Aún no tienes platos en tu menú. ¡Agrega el primero!
                            </div>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-3">
                                {products.map((product) => (
                                    <div key={product.id} className="border rounded-lg overflow-hidden flex flex-col justify-between">
                                        {product.imageUrl ? (
                                            <div className="w-full h-48 bg-zinc-100 dark:bg-zinc-800">
                                                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                                            </div>
                                        ) : (
                                            <div className="w-full h-48 bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 text-sm">
                                                Sin foto
                                            </div>
                                        )}
                                        <div className="p-4">
                                            <h4 className="font-semibold">{product.name}</h4>
                                            <p className="text-sm text-zinc-500 line-clamp-2 mt-1">{product.description}</p>
                                            <p className="font-bold mt-4 text-blue-600">S/ {product.price.toFixed(2)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}