'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Input, Segmented, Space, Typography } from 'antd';
import { ClearOutlined, EditOutlined, FontSizeOutlined } from '@ant-design/icons';
import { colors, radii, spacing, typography } from './tokens';

const { Text } = Typography;

export type SignatureMethod = 'typed' | 'drawn';

export type SignaturePadValue = {
  method: SignatureMethod;
  /** Legal name — required for typed; optional attribution for drawn. */
  fullName: string;
  /** PNG data URL when method is drawn. */
  signatureDataUrl: string;
};

export type SignaturePadProps = {
  value?: SignaturePadValue | null;
  onChange?: (value: SignaturePadValue) => void;
  /** Prefill typed name (e.g. first + last from the account step). */
  suggestedFullName?: string;
  disabled?: boolean;
  /** Height of the draw canvas in CSS pixels. */
  canvasHeight?: number;
};

const EMPTY: SignaturePadValue = {
  method: 'typed',
  fullName: '',
  signatureDataUrl: '',
};

function isDrawnBlank(dataUrl: string) {
  return !dataUrl || dataUrl.length < 80;
}

/** True when the pad has a usable typed name or drawn stroke. */
export function isSignatureComplete(value: SignaturePadValue | null | undefined): boolean {
  if (!value) return false;
  if (value.method === 'typed') {
    return value.fullName.trim().length >= 2;
  }
  return !isDrawnBlank(value.signatureDataUrl);
}

export function SignaturePad({
  value,
  onChange,
  suggestedFullName,
  disabled,
  canvasHeight = 140,
}: SignaturePadProps) {
  const current = value ?? EMPTY;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const [hasStroke, setHasStroke] = useState(!isDrawnBlank(current.signatureDataUrl));

  const emit = useCallback(
    (patch: Partial<SignaturePadValue>) => {
      onChange?.({ ...current, ...patch });
    },
    [current, onChange],
  );

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 320;
    const height = canvasHeight;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = colors.textPrimary;
    ctx.lineWidth = 2.25;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);
  }, [canvasHeight]);

  const latestDataUrl = useRef(current.signatureDataUrl);
  latestDataUrl.current = current.signatureDataUrl;

  // Restore a saved drawing only when the draw tab mounts; strokes stay on the canvas otherwise.
  useEffect(() => {
    if (current.method !== 'drawn') return;
    resizeCanvas();
    const saved = latestDataUrl.current;
    if (saved && !isDrawnBlank(saved)) {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        ctx.drawImage(img, 0, 0, canvas.clientWidth, canvasHeight);
        setHasStroke(true);
      };
      img.src = saved;
    }
  }, [current.method, resizeCanvas, canvasHeight]);

  const pointerPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const commitDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    setHasStroke(true);
    emit({ method: 'drawn', signatureDataUrl: dataUrl });
  };

  const clearDrawing = () => {
    resizeCanvas();
    setHasStroke(false);
    emit({ method: 'drawn', signatureDataUrl: '' });
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    drawing.current = true;
    canvas?.setPointerCapture(e.pointerId);
    const { x, y } = pointerPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || disabled) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = pointerPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    drawing.current = false;
    canvasRef.current?.releasePointerCapture(e.pointerId);
    commitDrawing();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
      <Segmented
        block
        disabled={disabled}
        value={current.method}
        onChange={(method) => {
          const next = method as SignatureMethod;
          if (next === 'typed') {
            emit({ method: 'typed', signatureDataUrl: '' });
          } else {
            emit({ method: 'drawn', signatureDataUrl: current.signatureDataUrl || '' });
            requestAnimationFrame(() => resizeCanvas());
          }
        }}
        options={[
          {
            value: 'typed',
            icon: <FontSizeOutlined />,
            label: 'Type name',
          },
          {
            value: 'drawn',
            icon: <EditOutlined />,
            label: 'Draw signature',
          },
        ]}
      />

      {current.method === 'typed' ? (
        <div>
          <Text
            type="secondary"
            style={{ display: 'block', marginBottom: 6, fontSize: typography.fontSize.sm }}
          >
            Type your full legal name to sign
          </Text>
          <Input
            size="large"
            disabled={disabled}
            placeholder={suggestedFullName?.trim() || 'Full legal name'}
            value={current.fullName}
            onChange={(e) => emit({ method: 'typed', fullName: e.target.value })}
            aria-label="Full legal name for signature"
          />
          {current.fullName.trim().length >= 2 ? (
            <div
              aria-hidden
              style={{
                marginTop: spacing.md,
                padding: `${spacing.md}px ${spacing.lg}px`,
                borderBottom: `2px solid ${colors.border}`,
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: 28,
                fontStyle: 'italic',
                color: colors.textPrimary,
                minHeight: 48,
              }}
            >
              {current.fullName.trim()}
            </div>
          ) : null}
        </div>
      ) : (
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 6,
            }}
          >
            <Text type="secondary" style={{ fontSize: typography.fontSize.sm }}>
              Draw your signature below
            </Text>
            <Button
              type="link"
              size="small"
              icon={<ClearOutlined />}
              disabled={disabled || !hasStroke}
              onClick={clearDrawing}
            >
              Clear
            </Button>
          </div>
          <canvas
            ref={canvasRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={{
              width: '100%',
              height: canvasHeight,
              touchAction: 'none',
              cursor: disabled ? 'not-allowed' : 'crosshair',
              border: `1px solid ${colors.border}`,
              borderRadius: radii.md,
              background: '#fff',
              display: 'block',
            }}
          />
          <Input
            style={{ marginTop: spacing.sm }}
            disabled={disabled}
            placeholder="Printed name (optional)"
            value={current.fullName}
            onChange={(e) => emit({ method: 'drawn', fullName: e.target.value })}
            aria-label="Printed name under drawn signature"
          />
        </div>
      )}

      {isSignatureComplete(current) ? (
        <Space size={4}>
          <Text type="success" style={{ fontSize: typography.fontSize.sm }}>
            Signature ready
          </Text>
        </Space>
      ) : (
        <Text type="secondary" style={{ fontSize: typography.fontSize.sm }}>
          {current.method === 'typed'
            ? 'Enter your full name to complete signing'
            : 'Draw your signature to complete signing'}
        </Text>
      )}
    </div>
  );
}
