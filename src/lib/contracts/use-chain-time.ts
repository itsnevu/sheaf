"use client";
import {useBlock} from 'wagmi';
import {elysiumTestnet} from './config';
/** Unlock controls follow the chain clock, not the visitor's local system clock. */
export function useChainTime(enabled:boolean){return useBlock({chainId:elysiumTestnet.id,query:{enabled,refetchInterval:5000}}).data?.timestamp??0n;}
