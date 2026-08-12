'use client';

import { useMutation } from '@apollo/client/react';
import { Button, Space, message } from 'antd';
import { BookOutlined, HeartFilled, HeartOutlined } from '@ant-design/icons';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import {
  SAVE_RESTAURANT,
  UNSAVE_RESTAURANT,
  FAVORITE_RESTAURANT,
  UNFAVORITE_RESTAURANT,
  RESTAURANT_DETAIL,
} from '@/lib/graphql';

type Props = {
  restaurantId: string;
  isSaved?: boolean;
  isFavorite?: boolean;
  size?: 'small' | 'middle' | 'large';
};

export function RestaurantBookmarkButtons({
  restaurantId,
  isSaved = false,
  isFavorite = false,
  size = 'middle',
}: Props) {
  const { user } = useAuth();
  const router = useRouter();
  const refetch = { query: RESTAURANT_DETAIL, variables: { id: restaurantId } };

  const [saveRestaurant, { loading: saving }] = useMutation(SAVE_RESTAURANT, {
    refetchQueries: [refetch],
  });
  const [unsaveRestaurant, { loading: unsaving }] = useMutation(UNSAVE_RESTAURANT, {
    refetchQueries: [refetch],
  });
  const [favoriteRestaurant, { loading: favoriting }] = useMutation(FAVORITE_RESTAURANT, {
    refetchQueries: [refetch],
  });
  const [unfavoriteRestaurant, { loading: unfavoriting }] = useMutation(UNFAVORITE_RESTAURANT, {
    refetchQueries: [refetch],
  });

  const requireAuth = () => {
    router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
  };

  const toggleSaved = async () => {
    if (!user) {
      requireAuth();
      return;
    }
    try {
      if (isSaved) {
        await unsaveRestaurant({ variables: { restaurantId } });
        message.success('Removed from saved');
      } else {
        await saveRestaurant({ variables: { restaurantId } });
        message.success('Restaurant saved');
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Could not update saved list');
    }
  };

  const toggleFavorite = async () => {
    if (!user) {
      requireAuth();
      return;
    }
    try {
      if (isFavorite) {
        await unfavoriteRestaurant({ variables: { restaurantId } });
        message.success('Removed from favorites');
      } else {
        await favoriteRestaurant({ variables: { restaurantId } });
        message.success('Added to favorites — we’ll alert you if a table opens up');
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Could not update favorites');
    }
  };

  return (
    <Space wrap className="rt-restaurant-bookmarks">
      <Button
        size={size}
        icon={isSaved ? <BookOutlined /> : <BookOutlined />}
        type={isSaved ? 'primary' : 'default'}
        ghost={isSaved}
        loading={saving || unsaving}
        onClick={toggleSaved}
      >
        {isSaved ? 'Saved' : 'Save'}
      </Button>
      <Button
        size={size}
        icon={isFavorite ? <HeartFilled style={{ color: '#eb2f96' }} /> : <HeartOutlined />}
        type={isFavorite ? 'default' : 'default'}
        loading={favoriting || unfavoriting}
        onClick={toggleFavorite}
      >
        {isFavorite ? 'Favorited' : 'Favorite'}
      </Button>
    </Space>
  );
}
