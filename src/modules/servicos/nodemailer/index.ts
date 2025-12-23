import * as nodemailer from 'nodemailer';
// OU
// import nodemailer from 'nodemailer';

export async function sendResetCodeEmail(to: string, code: string) {
  try {
    console.log('\n' + '📧'.repeat(20));
    console.log('📧 EMAIL DE RECUPERAÇÃO DE SENHA 📧');
    console.log('📧'.repeat(20));
    console.log(`📩 Para: ${to}`);
    console.log(`🔑 Código: ${code}`);
    console.log(`🕐 Gerado em: ${new Date().toLocaleString()}`);
    console.log(`⏰ Válido por: 1 hora`);
    
    // Verificar se o nodemailer está carregado
    console.log(`🔧 Nodemailer disponível: ${!!nodemailer.createTransport}`);
    console.log(`🔧 SMTP configurado: ${!!process.env.SMTP_HOST}`);
    
    // Se tiver variáveis de ambiente configuradas, tenta enviar
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      console.log('🚀 Tentando enviar email real via SMTP...');
      
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      // Testar conexão SMTP
      console.log('🔍 Verificando conexão SMTP...');
      await transporter.verify();
      console.log('✅ Conexão SMTP verificada com sucesso');

      const mailOptions = {
        from: `"Twendy Suporte" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to,
        subject: "🔐 Código de Redefinição de Senha - Twendy Create",
        text: `Seu código de redefinição é: ${code}`,
        html: `<div style="font-family: Arial, sans-serif; background-color:#f4f4f4; padding: 40px;">
                <div style="max-width: 600px; margin: auto; background: white; padding: 20px; border-radius: 5px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
                    <h2 style="color: #333;">Código de Redefinição de Senha - Twendy Create</h2>
                    <p style="font-size: 16px; color: #555;">
                    Use o seguinte código para redefinir sua senha:
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                        <span style="font-size: 24px; letter-spacing: 4px; padding: 10px 20px; border: 2px dashed #007BFF; border-radius: 5px; display: inline-block; color: #007BFF;">
                            <strong>${code}</strong>
                        </span>
                    </div>
                    <p style="font-size: 14px; color: #888;">
                    Se você não solicitou essa alteração, por favor ignore este email.
                    </p>
                    <hr style="margin: 30px 0; border:none; border-top: 1px solid #eee;" />
                    <p style="font-size: 12px; color: #aaa;">
                    Este é um email automático, por favor não responda.
                    </p>
                </div>
            </div>`
      };

      console.log('📤 Enviando email...');
      const info = await transporter.sendMail(mailOptions);
      
      console.log('✅ Email REAL enviado com sucesso!');
      console.log(`📨 Message ID: ${info.messageId}`);
      console.log(`👁️  Preview: https://mail.google.com/mail/u/0/#inbox`);
      
      return info;
      
    } else {
      console.log('⚠️  SMTP não configurado completamente.');
      console.log(`🔍 SMTP_HOST: ${process.env.SMTP_HOST ? '✅' : '❌'}`);
      console.log(`🔍 SMTP_USER: ${process.env.SMTP_USER ? '✅ (primeiros 3: ' + process.env.SMTP_USER.substring(0, 3) + '...)' : '❌'}`);
      console.log(`🔍 SMTP_PASS: ${process.env.SMTP_PASS ? '✅ (primeiros 3: ' + process.env.SMTP_PASS.substring(0, 3) + '...)' : '❌'}`);
      
      console.log('📧📧📧📧📧📧📧📧📧📧📧📧📧📧📧📧📧📧📧📧');
    }
    
    return { messageId: 'dev-mode', accepted: [to] };
    
  } catch (error: any) {
    console.error('❌ Erro no envio de email:');
    console.error(`   Mensagem: ${error.message}`);
    console.error(`   Código: ${error.code}`);
    console.error(`   Comando: ${error.command}`);
    
    if (error.code === 'EAUTH') {
      console.error('🔐 Erro de autenticação SMTP. Verifique:');
      console.error('   1. Email e senha corretos');
      console.error('   2. Verificação em 2 etapas ativada');
      console.error('   3. Senha de app gerada corretamente');
      console.error('   4. Acesso a apps menos seguros (se não usar app password)');
    }
    
    // Mesmo com erro, mostra o código no console
    console.log(`\n⚠️  MAS O CÓDIGO É: ${code} (use no reset password)`);
    
    // Não lança erro para não quebrar o fluxo
    return { messageId: 'error-fallback', accepted: [to] };
  }
}