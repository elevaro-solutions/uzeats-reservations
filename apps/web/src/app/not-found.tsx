import { Result, Button } from 'antd';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div component="NotFound" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <Result
        status="404"
        title="Page not found"
        subTitle="Sorry, the page you're looking for doesn't exist."
        extra={
          <Link href="/">
            <Button type="primary">Back to home</Button>
          </Link>
        }
      />
    </div>
  );
}
