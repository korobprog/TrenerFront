import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from '../../styles/auth/SignInModal.module.css';

export default function VerifyRequest() {
  const router = useRouter();
  const { email } = router.query;

  return (
    <>
      <Head>
        <title>Проверьте вашу почту - Сервис собеседований</title>
        <meta
          name="description"
          content="Ссылка для входа отправлена на вашу почту"
        />
      </Head>

      <div className={styles.overlay}>
        <div className={styles.modal}>
          <div className={styles.header}>
            <h1>Проверьте вашу почту</h1>
          </div>

          <div className={styles.content}>
            <div className={styles.emailIcon}>📧</div>

            <p className={styles.message}>
              Ссылка для входа была отправлена на адрес:
            </p>

            {email && (
              <p className={styles.emailAddress}>
                <strong>{email}</strong>
              </p>
            )}

            <p className={styles.instructions}>
              Перейдите по ссылке в письме, чтобы войти в систему. Ссылка
              действительна в течение 24 часов.
            </p>

            <div className={styles.tips}>
              <h3>Не получили письмо?</h3>
              <ul>
                <li>Проверьте папку "Спам" или "Нежелательная почта"</li>
                <li>Убедитесь, что адрес электронной почты указан правильно</li>
                <li>Попробуйте запросить новую ссылку через несколько минут</li>
              </ul>
            </div>

            <div className={styles.actions}>
              <Link href="/auth/signin" className={styles.backButton}>
                ← Вернуться к входу
              </Link>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .emailIcon {
          font-size: 4rem;
          text-align: center;
          margin-bottom: 1rem;
        }

        .message {
          text-align: center;
          color: #4a5568;
          margin-bottom: 0.5rem;
        }

        .emailAddress {
          text-align: center;
          color: #2d3748;
          font-size: 1.1rem;
          margin-bottom: 1.5rem;
          padding: 0.75rem;
          background: #f7fafc;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
        }

        .instructions {
          text-align: center;
          color: #718096;
          margin-bottom: 2rem;
          line-height: 1.6;
        }

        .tips {
          background: #f7fafc;
          padding: 1.5rem;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          margin-bottom: 2rem;
        }

        .tips h3 {
          color: #2d3748;
          font-size: 1.1rem;
          margin-bottom: 1rem;
        }

        .tips ul {
          color: #4a5568;
          padding-left: 1.5rem;
        }

        .tips li {
          margin-bottom: 0.5rem;
          line-height: 1.5;
        }

        .backButton {
          display: inline-block;
          padding: 0.75rem 1.5rem;
          background: #3182ce;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 500;
          transition: background-color 0.2s ease;
        }

        .backButton:hover {
          background: #2c5aa0;
        }

        .actions {
          text-align: center;
        }
      `}</style>
    </>
  );
}
