import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { createAdminSupabaseClient } from '@/lib/supabase-server';
import { userHasProjectAccess } from '@/lib/rbac';
import { handleGuardError, requireAuthentication } from '@/lib/server-guards';
import { logger } from '@/lib/debug-logger';
import { isValidUUID } from '@/lib/validation-helpers';

const WPT_ABI = ['function mint(address to, uint256 amount) external'];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> | { taskId: string } },
) {
  const { taskId } = await params;

  if (!isValidUUID(taskId)) {
    return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
  }

  try {
    const user = await requireAuthentication(request);
    const admin = createAdminSupabaseClient();

    if (!admin) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const { data: task, error: taskError } = await admin
      .from('tasks')
      .select('id, project_id, status, tx_hash')
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const hasAccess = await userHasProjectAccess(user, task.project_id, admin);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have access to this project' },
        { status: 403 },
      );
    }

    if (!['done', 'complete'].includes(task.status)) {
      return NextResponse.json({ error: 'Only completed tasks can be rewarded' }, { status: 400 });
    }

    if (task.tx_hash) {
      return NextResponse.json({ txHash: task.tx_hash, alreadyRewarded: true });
    }

    const rpcUrl = process.env.HARDHAT_RPC_URL || 'http://127.0.0.1:8545';
    const contractAddress = process.env.WPT_TOKEN_ADDRESS;
    const privateKey = process.env.WPT_OWNER_PRIVATE_KEY;

    if (!contractAddress || !privateKey) {
      return NextResponse.json(
        { error: 'WPT contract settings are not configured' },
        { status: 500 },
      );
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    const token = new ethers.Contract(contractAddress, WPT_ABI, wallet);
    const recipient = process.env.WPT_REWARD_RECIPIENT_ADDRESS || wallet.address;
    const rewardAmount = ethers.parseUnits(process.env.WPT_REWARD_AMOUNT || '10', 18);

    const tx = await token.mint(recipient, rewardAmount);
    const receipt = await tx.wait();
    const txHash = receipt?.hash || tx.hash;

    const { data: rewardedTask, error: updateError } = await admin
      .from('tasks')
      .update({ tx_hash: txHash, updated_at: new Date().toISOString() })
      .eq('id', taskId)
      .is('tx_hash', null)
      .select('tx_hash')
      .single();

    if (updateError || !rewardedTask) {
      const { data: currentTask } = await admin
        .from('tasks')
        .select('tx_hash')
        .eq('id', taskId)
        .single();

      if (currentTask?.tx_hash) {
        return NextResponse.json({ txHash: currentTask.tx_hash, alreadyRewarded: true });
      }

      logger.error('Failed to save reward transaction hash', { taskId, txHash }, updateError);
      return NextResponse.json(
        { error: 'Reward minted, but failed to save transaction hash', txHash },
        { status: 500 },
      );
    }

    return NextResponse.json({ txHash });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      (error.name === 'AuthenticationError' ||
        error.name === 'PermissionError' ||
        error.name === 'ForbiddenError')
    ) {
      return handleGuardError(error);
    }

    logger.error('Error rewarding task', { taskId }, error as Error);
    return NextResponse.json({ error: 'Failed to reward task' }, { status: 500 });
  }
}
