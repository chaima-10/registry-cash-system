const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

exports.sendVerificationEmail = async (email, token) => {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;

    try {
        const { data, error } = await resend.emails.send({
            from: 'Registry Cash System <onboarding@resend.dev>',
            to: [email],
            subject: 'Vérifiez votre nouvelle adresse e-mail',
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 40px; border-radius: 20px; background-color: #ffffff; border: 1px solid #f0f0f0; box-shadow: 0 10px 30px rgba(0,0,0,0.05);">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #1a1a1a; margin: 0; font-size: 24px;">Vérification de l'e-mail</h1>
                    </div>
                    
                    <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">Bonjour,</p>
                    <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">Vous avez demandé à mettre à jour votre adresse e-mail sur <strong>Registry Cash System</strong>. Pour valider ce changement, veuillez cliquer sur le bouton ci-dessous :</p>
                    
                    <div style="text-align: center; margin: 40px 0;">
                        <a href="${verificationUrl}" style="background-color: #3b82f6; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; display: inline-block; transition: background-color 0.3s ease; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);">
                            Confirmer mon adresse e-mail
                        </a>
                    </div>
                    
                    <p style="color: #888; font-size: 14px; text-align: center;">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :</p>
                    <p style="color: #3b82f6; font-size: 13px; text-align: center; word-break: break-all;">
                        <a href="${verificationUrl}" style="color: #3b82f6;">${verificationUrl}</a>
                    </p>
                    
                    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
                        <p style="font-size: 12px; color: #aaa;">Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail en toute sécurité.</p>
                        <p style="font-size: 12px; color: #aaa;">&copy; 2026 Registry Cash System</p>
                    </div>
                </div>
            `,
        });

        if (error) {
            console.error('Resend Error:', error);
            throw new Error('Erreur lors de l\'envoi de l\'e-mail via Resend');
        }

        console.log(`Verification email sent via Resend to ${email}. ID: ${data.id}`);
    } catch (error) {
        console.error('Error sending verification email with Resend:', error);
        throw new Error('Erreur lors de l\'envoi de l\'e-mail de vérification');
    }
};
