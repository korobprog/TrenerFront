import { useRouter } from 'next/router';
import styles from '../../styles/InterviewButton.module.css';

export default function InterviewButton() {
  const router = useRouter();

  const handleClick = () => {
    router.push('/mock-interviews');
  };

  return (
    <button className={styles.interviewButton} onClick={handleClick}>
      Пройти мок-собеседование
    </button>
  );
}
