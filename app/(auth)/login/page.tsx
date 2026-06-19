"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const loginSchema = z.object({
    email: z.string().email("Correo inválido"),
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export default function LoginPage() {
    const { register, handleSubmit, formState: { errors } } = useForm({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: any) => {
        try {
            await signInWithEmailAndPassword(auth, data.email, data.password);
            alert("¡Bienvenido!");
        } catch (error: any) {
            alert("Error: " + error.message);
        }
    };

    return (
        <div className="max-w-md mx-auto p-8">
            <h1 className="text-2xl font-bold mb-4">Iniciar Sesión</h1>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                    <Input {...register("email")} placeholder="Correo electrónico" />
                    {errors.email && <p className="text-red-500 text-sm">{errors.email.message as string}</p>}
                </div>
                <div>
                    <Input {...register("password")} type="password" placeholder="Contraseña" />
                    {errors.password && <p className="text-red-500 text-sm">{errors.password.message as string}</p>}
                </div>
                <Button type="submit" className="w-full">Entrar</Button>
            </form>
        </div>
    );
}