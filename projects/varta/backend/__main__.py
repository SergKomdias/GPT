import argparse
import os
import uvicorn
from .config import ROOT, load_env

def main():
    parser=argparse.ArgumentParser(description="Варта — локальний сервер спостереження")
    parser.add_argument('--lan',action='store_true',help='Доступ із ноутбука у локальній мережі')
    parser.add_argument('--port',type=int,default=8765)
    args=parser.parse_args()
    load_env(ROOT/'.env')
    if args.lan and len(os.environ.get('VARTA_OPERATOR_TOKEN',''))<16:
        parser.error('Для --lan задайте VARTA_OPERATOR_TOKEN (щонайменше 16 символів) у .env')
    uvicorn.run('backend.app:create_app',factory=True,host='0.0.0.0' if args.lan else '127.0.0.1',port=args.port,access_log=False)

if __name__=='__main__':
    main()
